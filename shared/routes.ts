
import { z } from 'zod';
import {
  insertSaleSchema,
  sales,
  insertOilSaleSchema,
  oilSales,
  insertOilPurchaseSchema,
  oilPurchases,
  oilStockSchema,
  insertHelmetSaleSchema,
  helmetSales,
  insertHelmetPurchaseSchema,
  helmetPurchases,
  helmetStockSchema,
  insertSaddleSaleSchema,
  saddleSales,
  insertSaddlePurchaseSchema,
  saddlePurchases,
  saddleStockSchema,
  insertDeferredSaleSchema,
  deferredSales,
  insertDiversPurchaseSchema,
  diversPurchases,
  diversStockSchema,
  insertClientSchema,
  clients,
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  sales: {
    list: {
      method: 'GET' as const,
      path: '/api/sales',
      responses: {
        200: z.array(z.custom<typeof sales.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/sales',
      input: insertSaleSchema,
      responses: {
        201: z.custom<typeof sales.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/sales/:id',
      input: insertSaleSchema.partial(),
      responses: {
        200: z.custom<typeof sales.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/sales/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    // Bulk update for importing CSV data or quick edits
    bulkCreate: {
      method: 'POST' as const,
      path: '/api/sales/bulk',
      input: z.array(insertSaleSchema),
      responses: {
        201: z.array(z.custom<typeof sales.$inferSelect>()),
        400: errorSchemas.validation,
      },
    }
  },
  oil: {
    stock: {
      get: {
        method: 'GET' as const,
        path: '/api/oil/stock',
        responses: {
          200: oilStockSchema,
        },
      },
    },
    sales: {
      list: {
        method: 'GET' as const,
        path: '/api/oil/sales',
        responses: {
          200: z.array(z.custom<typeof oilSales.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/oil/sales',
        input: insertOilSaleSchema,
        responses: {
          201: z.custom<typeof oilSales.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: 'PUT' as const,
        path: '/api/oil/sales/:id',
        input: insertOilSaleSchema.partial(),
        responses: {
          200: z.custom<typeof oilSales.$inferSelect>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/oil/sales/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },
    purchases: {
      list: {
        method: 'GET' as const,
        path: '/api/oil/purchases',
        responses: {
          200: z.array(z.custom<typeof oilPurchases.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/oil/purchases',
        input: insertOilPurchaseSchema,
        responses: {
          201: z.custom<typeof oilPurchases.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/oil/purchases/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },
  },
  helmets: {
    stock: {
      get: {
        method: 'GET' as const,
        path: '/api/helmets/stock',
        responses: {
          200: helmetStockSchema,
        },
      },
    },
    sales: {
      list: {
        method: 'GET' as const,
        path: '/api/helmets/sales',
        responses: {
          200: z.array(z.custom<typeof helmetSales.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/helmets/sales',
        input: insertHelmetSaleSchema,
        responses: {
          201: z.custom<typeof helmetSales.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: 'PUT' as const,
        path: '/api/helmets/sales/:id',
        input: insertHelmetSaleSchema.partial(),
        responses: {
          200: z.custom<typeof helmetSales.$inferSelect>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/helmets/sales/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },
    purchases: {
      list: {
        method: 'GET' as const,
        path: '/api/helmets/purchases',
        responses: {
          200: z.array(z.custom<typeof helmetPurchases.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/helmets/purchases',
        input: insertHelmetPurchaseSchema,
        responses: {
          201: z.custom<typeof helmetPurchases.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/helmets/purchases/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },
  },
  saddles: {
    stock: {
      get: {
        method: 'GET' as const,
        path: '/api/saddles/stock',
        responses: {
          200: saddleStockSchema,
        },
      },
    },
    sales: {
      list: {
        method: 'GET' as const,
        path: '/api/saddles/sales',
        responses: {
          200: z.array(z.custom<typeof saddleSales.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/saddles/sales',
        input: insertSaddleSaleSchema,
        responses: {
          201: z.custom<typeof saddleSales.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: 'PUT' as const,
        path: '/api/saddles/sales/:id',
        input: insertSaddleSaleSchema.partial(),
        responses: {
          200: z.custom<typeof saddleSales.$inferSelect>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/saddles/sales/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },
    purchases: {
      list: {
        method: 'GET' as const,
        path: '/api/saddles/purchases',
        responses: {
          200: z.array(z.custom<typeof saddlePurchases.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/saddles/purchases',
        input: insertSaddlePurchaseSchema,
        responses: {
          201: z.custom<typeof saddlePurchases.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/saddles/purchases/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },
  },
  deferred: {
    stock: {
      get: {
        method: 'GET' as const,
        path: '/api/deferred/stock',
        responses: {
          200: diversStockSchema,
        },
      },
    },
    sales: {
      list: {
        method: 'GET' as const,
        path: '/api/deferred/sales',
        responses: {
          200: z.array(z.custom<typeof deferredSales.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/deferred/sales',
        input: insertDeferredSaleSchema,
        responses: {
          201: z.custom<typeof deferredSales.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      update: {
        method: 'PUT' as const,
        path: '/api/deferred/sales/:id',
        input: insertDeferredSaleSchema.partial(),
        responses: {
          200: z.custom<typeof deferredSales.$inferSelect>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/deferred/sales/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },
    purchases: {
      list: {
        method: 'GET' as const,
        path: '/api/deferred/purchases',
        responses: {
          200: z.array(z.custom<typeof diversPurchases.$inferSelect>()),
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/deferred/purchases',
        input: insertDiversPurchaseSchema,
        responses: {
          201: z.custom<typeof diversPurchases.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/deferred/purchases/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },
  },
  clients: {
    list: {
      method: 'GET' as const,
      path: '/api/clients',
      responses: {
        200: z.array(z.custom<typeof clients.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/clients',
      input: insertClientSchema,
      responses: {
        201: z.custom<typeof clients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/clients/:id',
      input: insertClientSchema.partial(),
      responses: {
        200: z.custom<typeof clients.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/clients/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type SaleInput = z.infer<typeof api.sales.create.input>;
export type SaleResponse = z.infer<typeof api.sales.create.responses[201]>;
