import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'SocialNet API',
      version: '1.0.0',
      description:
        'REST API cho mạng xã hội SocialNet. Xác thực dùng cặp access token (Bearer, 15 phút) + refresh token (httpOnly cookie, 30 ngày) — gọi POST /auth/refresh khi accessToken hết hạn để lấy token mới mà không cần đăng nhập lại.',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token ngắn hạn (15 phút), lấy từ /auth/login, /auth/register hoặc /auth/refresh.',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            avatar: { type: 'string' },
            bio: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user'] },
            isBanned: { type: 'boolean' },
            isOnline: { type: 'boolean' },
            friendsCount: { type: 'integer' },
            followersCount: { type: 'integer' },
            followingCount: { type: 'integer' },
          },
        },
        Post: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
            content: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } },
            privacy: { type: 'string', enum: ['public', 'friends', 'only_me'] },
            commentsCount: { type: 'integer' },
            sharesCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./server/routes/*.ts'],
};

export const openApiSpec = swaggerJSDoc(options);
