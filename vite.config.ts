// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on mode and current working directory.
  // The third argument '' allows loading variables without the VITE_ prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // Make env variables available in the client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // If you have other environment variables you want to expose, define them here.
      // e.g., 'process.env.SOME_OTHER_VARIABLE': JSON.stringify(env.SOME_OTHER_VARIABLE),
    },
    // If your index.html is not in the project root, you might need to specify it:
    // root: './', // This is the default, so usually not needed.
    // server: {
    //   port: 3000, // Optionally, specify a port
    // },
  };
});