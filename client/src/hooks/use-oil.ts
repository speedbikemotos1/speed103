import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type OilSaleInput = z.infer<typeof api.oil.sales.create.input>;
type OilPurchaseInput = z.infer<typeof api.oil.purchases.create.input>;

export function useOilStock() {
  return useQuery({
    queryKey: [api.oil.stock.get.path],
    queryFn: async () => {
      const res = await fetch(api.oil.stock.get.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.oil.stock.get.responses[200].parse(await res.json());
    },
  });
}

export function useOilSales() {
  return useQuery({
    queryKey: [api.oil.sales.list.path],
    queryFn: async () => {
      const res = await fetch(api.oil.sales.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.oil.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useOilPurchases() {
  return useQuery({
    queryKey: [api.oil.purchases.list.path],
    queryFn: async () => {
      const res = await fetch(api.oil.purchases.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.oil.purchases.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateOilSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: OilSaleInput) => {
      const res = await fetch(api.oil.sales.create.path, {
        method: api.oil.sales.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Failed to create oil sale");
      }
      return api.oil.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.oil.sales.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.oil.stock.get.path] });
    },
  });
}

export function useUpdateOilSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<OilSaleInput>) => {
      const url = buildUrl(api.oil.sales.update.path, { id });
      const res = await fetch(url, {
        method: api.oil.sales.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.oil.sales.update.responses[200].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.oil.sales.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.oil.stock.get.path] });
    },
  });
}

export function useDeleteOilSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.oil.sales.delete.path, { id });
      const res = await fetch(url, { method: api.oil.sales.delete.method, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.oil.sales.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.oil.stock.get.path] });
    },
  });
}

export function useCreateOilPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: OilPurchaseInput) => {
      const res = await fetch(api.oil.purchases.create.path, {
        method: api.oil.purchases.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.oil.purchases.create.responses[201].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.oil.purchases.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.oil.stock.get.path] });
    },
  });
}

export function useDeleteOilPurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.oil.purchases.delete.path, { id });
      const res = await fetch(url, { method: api.oil.purchases.delete.method, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.oil.purchases.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.oil.stock.get.path] });
    },
  });
}

