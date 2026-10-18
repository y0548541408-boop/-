import { prisma } from "@/lib/prisma";
import { ASSET_GROUPS, LIABILITY_GROUPS } from "@/lib/netWorthGroups";

export type NetWorthEntry = {
  id: string;
  kind: "asset" | "liability";
  group: string;
  name: string;
  value: number;
  updatedAt: Date;
};

export type NetWorthGroup = { group: string; total: number; items: NetWorthEntry[] };

export type NetWorthSummary = {
  assets: number;
  liabilities: number;
  net: number;
  investments: number;
  assetGroups: NetWorthGroup[];
  liabilityGroups: NetWorthGroup[];
  history: { month: Date; net: number }[];
};

function groupItems(items: NetWorthEntry[], order: readonly string[]): NetWorthGroup[] {
  const byGroup = new Map<string, NetWorthEntry[]>();
  for (const item of items) {
    const list = byGroup.get(item.group) ?? [];
    list.push(item);
    byGroup.set(item.group, list);
  }
  const rank = (g: string) => (order.indexOf(g) === -1 ? order.length : order.indexOf(g));
  return [...byGroup.entries()]
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([group, list]) => ({
      group,
      total: list.reduce((s, i) => s + i.value, 0),
      items: list,
    }));
}

export async function getFamilyNetWorth(familyId: string): Promise<NetWorthSummary> {
  const [rows, snapshots] = await Promise.all([
    prisma.netWorthItem.findMany({ where: { familyId }, orderBy: { createdAt: "asc" } }),
    prisma.netWorthSnapshot.findMany({
      where: { familyId },
      orderBy: { month: "asc" },
      take: 24,
    }),
  ]);

  const items: NetWorthEntry[] = rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    group: r.group,
    name: r.name,
    value: Number(r.value),
    updatedAt: r.updatedAt,
  }));

  const assetItems = items.filter((i) => i.kind === "asset");
  const liabilityItems = items.filter((i) => i.kind === "liability");
  const assets = assetItems.reduce((s, i) => s + i.value, 0);
  const liabilities = liabilityItems.reduce((s, i) => s + i.value, 0);

  return {
    assets,
    liabilities,
    net: assets - liabilities,
    investments: assetItems.filter((i) => i.group === "השקעות").reduce((s, i) => s + i.value, 0),
    assetGroups: groupItems(assetItems, ASSET_GROUPS),
    liabilityGroups: groupItems(liabilityItems, LIABILITY_GROUPS),
    history: snapshots.map((s) => ({
      month: s.month,
      net: Number(s.assets) - Number(s.liabilities),
    })),
  };
}

// Keeps this month's snapshot in line with the current items.
export async function recordNetWorthSnapshot(familyId: string): Promise<void> {
  const rows = await prisma.netWorthItem.findMany({
    where: { familyId },
    select: { kind: true, value: true },
  });
  const assets = rows.filter((r) => r.kind === "asset").reduce((s, r) => s + Number(r.value), 0);
  const liabilities = rows
    .filter((r) => r.kind === "liability")
    .reduce((s, r) => s + Number(r.value), 0);
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.netWorthSnapshot.upsert({
    where: { familyId_month: { familyId, month } },
    update: { assets, liabilities },
    create: { familyId, month, assets, liabilities },
  });
}
