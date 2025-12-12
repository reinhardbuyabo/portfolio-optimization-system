
"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Portfolio } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ClientPortfoliosTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function ClientPortfoliosTable<TData, TValue>({
  columns,
  data,
}: ClientPortfoliosTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="my-4 p-4 rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export const columns: ColumnDef<Portfolio & { user: { id: string; name: string | null; email: string | null; } }>[] = [
  {
    accessorKey: "user.name",
    header: "Client Name",
    cell: ({ row }) => {
      const user = row.original.user;
      return <Link href={`/dashboard/client-portfolios?investor=${user.id}`}>{user.name}</Link>;
    },
  },
  {
    accessorKey: "name",
    header: "Portfolio Name",
    cell: ({ row }) => {
      const portfolio = row.original;
      return <Link href={`/dashboard/portfolios/${portfolio.id}`}>{portfolio.name}</Link>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const portfolio = row.original;
      return (
        <Button variant="outline" size="sm" asChild className="my-2">
          <Link href={`/dashboard/portfolios/${portfolio.id}/optimize`}>Optimize</Link>
        </Button>
      );
    },
  },
];
