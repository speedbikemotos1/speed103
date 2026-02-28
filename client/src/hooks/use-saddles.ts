import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type SaddleSaleInput = z.infer<typeof api.saddles.sales.create.input>;
type SaddlePurchaseInput = z.infer<typeof api.saddles.purchases.create.input>;

export function useSaddleStock() {
  return useQuery({
    queryKey: [api.saddles.stock.get.path],
    queryFn: async () => {
      const res = await fetch(api.saddles.stock.get.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.saddles.stock.get.responses[200].parse(await res.json());
    },
  });
}

export function useSaddleSales() {
  return useQuery({
    queryKey: [api.saddles.sales.list.path],
    queryFn: async () => {
      const res = await fetch(api.saddles.sales.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.saddles.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useSaddlePurchases() {
  return useQuery({
    queryKey: [api.saddles.purchases.list.path],
    queryFn: async () => {
      const res = await fetch(api.saddles.purchases.list.path, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return api.saddles.purchases.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSaddleSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaddleSaleInput) => {
      const res = await fetch(api.saddles.sales.create.path, {
        method: api.saddles.sales.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.saddles.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.saddles.sales.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.saddles.stock.get.path] });
    },
  });
}

export function useUpdateSaddleSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<SaddleSaleInput>) => {
      const url = buildUrl(api.saddles.sales.update.path, { id });
      const res = await fetch(url, {
        method: api.saddles.sales.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.saddles.sales.update.responses[200].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.saddles.sales.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.saddles.stock.get.path] });
    },
  });
}

export function useDeleteSaddleSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.saddles.sales.delete.path, { id });
      const res = await fetch(url, { method: api.saddles.sales.delete.method, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.saddles.sales.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.saddles.stock.get.path] });
    },
  });
}

export function useCreateSaddlePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaddlePurchaseInput) => {
      const res = await fetch(api.saddles.purchases.create.path, {
        method: api.saddles.purchases.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return api.saddles.purchases.create.responses[201].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.saddles.purchases.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.saddles.stock.get.path] });
    },
  });
}

export function useDeleteSaddlePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.saddles.purchases.delete.path, { id });
      const res = await fetch(url, { method: api.saddles.purchases.delete.method, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [api.saddles.purchases.list.path] });
      await queryClient.invalidateQueries({ queryKey: [api.saddles.stock.get.path] });
    },
  });
}
