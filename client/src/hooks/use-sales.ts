import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type SaleInput, type SaleResponse } from "@shared/routes";

export function useSales() {
  return useQuery({
    queryKey: [api.sales.list.path],
    queryFn: async () => {
      const res = await fetch(api.sales.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch sales data");
      return api.sales.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaleInput) => {
      const res = await fetch(api.sales.create.path, {
        method: api.sales.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = await res.json();
          throw new Error(error.message || "Validation failed");
        }
        throw new Error("Failed to create sale");
      }
      return api.sales.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.sales.list.path] }),
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<SaleInput>) => {
      const url = buildUrl(api.sales.update.path, { id });
      const res = await fetch(url, {
        method: api.sales.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to update sale");
      }
      return api.sales.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.sales.list.path] }),
  });
}

export function useDeleteSale() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.sales.delete.path, { id });
      const res = await fetch(url, {
        method: api.sales.delete.method,
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to delete sale");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.sales.list.path] }),
  });
}
