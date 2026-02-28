import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type HelmetSaleInput = z.infer<typeof api.helmets.sales.create.input>;
type HelmetPurchaseInput = z.infer<typeof api.helmets.purchases.create.input>;

export function useHelmetStock() {
  return useQuery({
    queryKey: [api.helmets.stock.get.path],
    queryFn: async () => {
      const res = await fetch(api.helmets.stock.get.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.helmets.stock.get.responses[200].parse(await res.json());
    },
  });
}

export function useHelmetSales() {
  return useQuery({
    queryKey: [api.helmets.sales.list.path],
    queryFn: async () => {
      const res = await fetch(api.helmets.sales.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.helmets.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useHelmetPurchases() {
  return useQuery({
    queryKey: [api.helmets.purchases.list.path],
    queryFn: async () => {
      const res = await fetch(api.helmets.purchases.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.helmets.purchases.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateHelmetSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: HelmetSaleInput) => {
      const res = await fetch(api.helmets.sales.create.path, {
        method: api.helmets.sales.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.helmets.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.helmets.sales.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.helmets.stock.get.path] });
    },
  });
}

export function useUpdateHelmetSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<HelmetSaleInput>) => {
      const url = buildUrl(api.helmets.sales.update.path, { id });
      const res = await fetch(url, {
        method: api.helmets.sales.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.helmets.sales.update.responses[200].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.helmets.sales.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.helmets.stock.get.path] });
    },
  });
}

export function useDeleteHelmetSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.helmets.sales.delete.path, { id });
      const res = await fetch(url, { method: api.helmets.sales.delete.method, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.helmets.sales.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.helmets.stock.get.path] });
    },
  });
}

export function useCreateHelmetPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: HelmetPurchaseInput) => {
      const res = await fetch(api.helmets.purchases.create.path, {
        method: api.helmets.purchases.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.helmets.purchases.create.responses[201].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.helmets.purchases.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.helmets.stock.get.path] });
    },
  });
}

export function useDeleteHelmetPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.helmets.purchases.delete.path, { id });
      const res = await fetch(url, { method: api.helmets.purchases.delete.method, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.helmets.purchases.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.helmets.stock.get.path] });
    },
  });
}

