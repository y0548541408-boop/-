import { getFamilyNetWorth } from "@/lib/netWorth";
import { ASSET_GROUPS, LIABILITY_GROUPS } from "@/lib/netWorthGroups";
import NetWorthItems from "@/app/dashboard/networth/NetWorthItems";
import { formatShekel } from "@/app/dashboard/RiseCard";

const CARD = "rounded-3xl bg-white p-5 shadow-[0_2px_14px_rgba(11,95,88,0.07)]";

// The "assets against liabilities" part of the mapping. The client fills it in on
// their own side; the advisor sees the totals.
export default async function AssetsTab({ familyId, editable }: { familyId: string; editable: boolean }) {
  const worth = await getFamilyNetWorth(familyId);

  return (
    <div className="mt-5 space-y-4">
      <div className={CARD}>
        <p className="text-sm text-ru-muted">השווי הנקי</p>
        <p className={`mt-1 text-3xl font-bold ${worth.net >= 0 ? "text-ru-ink" : "text-ru-pink"}`}>
          {worth.net < 0 ? "-" : ""}
          {formatShekel(Math.abs(worth.net))}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div>
            <p className="text-xs text-ru-muted">נכסים</p>
            <p className="text-base font-bold text-ru-green">{formatShekel(worth.assets)}</p>
          </div>
          <div>
            <p className="text-xs text-ru-muted">התחייבויות</p>
            <p className="text-base font-bold text-ru-pink">{formatShekel(worth.liabilities)}</p>
          </div>
        </div>
      </div>

      {editable ? (
        <>
          <NetWorthItems kind="asset" title="נכסים" total={worth.assets} groups={worth.assetGroups} groupOptions={ASSET_GROUPS} />
          <NetWorthItems
            kind="liability"
            title="התחייבויות"
            total={worth.liabilities}
            groups={worth.liabilityGroups}
            groupOptions={LIABILITY_GROUPS}
          />
        </>
      ) : (
        <p className="text-sm text-ru-muted">הלקוח ממלא את הנכסים וההתחייבויות באזור האישי שלו.</p>
      )}
    </div>
  );
}
