export interface FileChange {
  path: string;
  content?: string; // utf-8 or base64
  encoding?: 'utf-8' | 'base64';
  delete?: boolean;
}

export interface CommitOptions {
  token: string;
  owner?: string;
  repo?: string;
  branch?: string;
  message?: string;
  changes: FileChange[];
}

const DEFAULT_OWNER = 'Fracta-lia';
const DEFAULT_REPO = 'Fractalia-Portfolio';
const DEFAULT_BRANCH = 'master';

export async function verifyGitHubToken(token: string, owner = DEFAULT_OWNER, repo = DEFAULT_REPO): Promise<{ success: boolean; error?: string; username?: string }> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      if (res.status === 401) return { success: false, error: 'Token inválido o expirado.' };
      if (res.status === 404) return { success: false, error: 'Repositorio no encontrado o el token no tiene permisos de lectura.' };
      return { success: false, error: `Error ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    const canPush = data.permissions ? data.permissions.push : true;
    if (!canPush) {
      return { success: false, error: 'El token es válido pero no tiene permisos de escritura (push).' };
    }

    return { success: true, username: data.owner?.login };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error de conexión con GitHub.' };
  }
}

export async function commitFilesToGitHub({
  token,
  owner = DEFAULT_OWNER,
  repo = DEFAULT_REPO,
  branch = DEFAULT_BRANCH,
  message = 'Actualización de contenido desde el editor web',
  changes,
}: CommitOptions): Promise<{ success: boolean; commitSha?: string; error?: string }> {
  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    // 1. Get current branch reference
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers });
    if (!refRes.ok) throw new Error(`No se pudo obtener la rama ${branch} (${refRes.status})`);
    const refData = await refRes.json();
    const latestCommitSha = refData.object.sha;

    // 2. Get the commit to get the base tree SHA
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
    if (!commitRes.ok) throw new Error(`No se pudo obtener el commit base (${commitRes.status})`);
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree.sha;

    // 3. Create blobs for new/modified files
    const treeItems = [];
    for (const change of changes) {
      if (change.delete) {
        treeItems.push({
          path: change.path,
          mode: '100644',
          type: 'blob' as const,
          sha: null as any,
        });
        continue;
      }

      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: change.content,
          encoding: change.encoding || 'utf-8',
        }),
      });

      if (!blobRes.ok) {
        const errText = await blobRes.text();
        throw new Error(`Error al crear archivo ${change.path}: ${errText}`);
      }

      const blobData = await blobRes.json();
      treeItems.push({
        path: change.path,
        mode: '100644',
        type: 'blob' as const,
        sha: blobData.sha,
      });
    }

    // 4. Create new tree
    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    });

    if (!treeRes.ok) {
      const errText = await treeRes.text();
      throw new Error(`Error al crear el árbol de archivos: ${errText}`);
    }
    const newTreeData = await treeRes.json();

    // 5. Create new commit
    const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        tree: newTreeData.sha,
        parents: [latestCommitSha],
      }),
    });

    if (!newCommitRes.ok) {
      const errText = await newCommitRes.text();
      throw new Error(`Error al crear el commit: ${errText}`);
    }
    const newCommitData = await newCommitRes.json();

    // 6. Update reference
    const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false,
      }),
    });

    if (!updateRefRes.ok) {
      const errText = await updateRefRes.text();
      throw new Error(`Error al actualizar la rama ${branch}: ${errText}`);
    }

    return { success: true, commitSha: newCommitData.sha };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar en GitHub.' };
  }
}
