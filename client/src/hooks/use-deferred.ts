import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type DeferredSaleInput = z.infer<typeof api.deferred.sales.create.input>;
type DiversPurchaseInput = z.infer<typeof api.deferred.purchases.create.input>;

const deferredInvalidateKeys = () => [
  [api.deferred.sales.list.path],
  [api.deferred.purchases.list.path],
  [api.deferred.stock.get.path],
];

export function useDeferredSales() {
  return useQuery({
    queryKey: [api.deferred.sales.list.path],
    queryFn: async () => {
      const res = await fetch(api.deferred.sales.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.deferred.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDeferredSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: DeferredSaleInput) => {
      const res = await fetch(api.deferred.sales.create.path, {
        method: api.deferred.sales.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.deferred.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: async () => {
      for (const k of deferredInvalidateKeys()) await queryClient.invalidateQueries({ queryKey: k });
    },
  });
}

export function useUpdateDeferredSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<DeferredSaleInput>) => {
      const url = buildUrl(api.deferred.sales.update.path, { id });
      const res = await fetch(url, {
        method: api.deferred.sales.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.deferred.sales.update.responses[200].parse(await res.json());
    },
    onSuccess: async () => {
      for (const k of deferredInvalidateKeys()) await queryClient.invalidateQueries({ queryKey: k });
    },
  });
}

export function useDeleteDeferredSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.deferred.sales.delete.path, { id });
      const res = await fetch(url, { method: api.deferred.sales.delete.method, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      for (const k of deferredInvalidateKeys()) await queryClient.invalidateQueries({ queryKey: k });
    },
  });
}

// Divers purchases & stock
export function useDiversPurchases() {
  return useQuery({
    queryKey: [api.deferred.purchases.list.path],
    queryFn: async () => {
      const res = await fetch(api.deferred.purchases.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.deferred.purchases.list.responses[200].parse(await res.json());
    },
  });
}

export function useDiversStock() {
  return useQuery({
    queryKey: [api.deferred.stock.get.path],
    queryFn: async () => {
      const res = await fetch(api.deferred.stock.get.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.deferred.stock.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDiversPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: DiversPurchaseInput) => {
      const res = await fetch(api.deferred.purchases.create.path, {
        method: api.deferred.purchases.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.deferred.purchases.create.responses[201].parse(await res.json());
    },
    onSuccess: async () => {
      for (const k of deferredInvalidateKeys()) await queryClient.invalidateQueries({ queryKey: k });
    },
  });
}

export function useDeleteDiversPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.deferred.purchases.delete.path, { id });
      const res = await fetch(url, { method: api.deferred.purchases.delete.method, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      for (const k of deferredInvalidateKeys()) await queryClient.invalidateQueries({ queryKey: k });
    },
  });
}

