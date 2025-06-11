import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // Or your specific framework plugin

export default defineConfig({
  plugins: [react()], // Your existing plugins
  server: {
    // ... other server options if you have any
    cors: {
      origin: [
        'https://9000-allanwatts7-revideotemp-16mgw7k7x57.ws-eu120.gitpod.io/',
        // Add other allowed origins here if needed, e.g., 'http://localhost:3000'
      ],
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'], // Example: specify allowed methods
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
  },
  // ... other top-level config options
});