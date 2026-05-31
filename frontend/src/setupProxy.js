// This file is automatically loaded by Create React App (craco) dev server.
// It sets up a local proxy so the browser never directly calls the NVIDIA API,
// which completely eliminates CORS errors.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api/nvidia',
    createProxyMiddleware({
      target: 'https://integrate.api.nvidia.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api/nvidia': '/v1', // /api/nvidia/chat/completions → /v1/chat/completions
      },
      on: {
        error: (err, req, res) => {
          console.error('[NVIDIA Proxy Error]', err.message);
          res.status(502).json({ error: 'Proxy error: Could not reach NVIDIA API.' });
        },
      },
    })
  );
};
