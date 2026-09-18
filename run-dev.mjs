import { dev } from 'astro';

try {
  const server = await dev({
    root: 'C:\\Users\\tlacu\\OneDrive\\Escritorio\\PaginaLía',
    server: { port: 4321, host: true }
  });
  console.log('Astro dev server started successfully at http://localhost:4321');
} catch (err) {
  console.error('Error starting dev server:', err);
}
