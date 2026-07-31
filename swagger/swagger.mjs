import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger tanımı
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Scraper API',
    version: '1.0.0',
    description: 'Scraper API dokümantasyonu',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.mjs'], // Route dosyalarınızın bulunduğu yer
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};

export default setupSwagger;
