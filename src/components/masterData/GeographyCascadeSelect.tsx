import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Dropdown } from "../ui/Dropdown";
import { getMasterItems, type MasterDataItem } from "../../api/options.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";

type Props = {
  district: string;
  taluk: string;
  town: string;
  pincode: string;
  onChange: (next: {
    district: string;
    districtId: number | null;
    taluk: string;
    talukId: number | null;
    town: string;
    townId: number | null;
    pincode: string;
    pincodeId: number | null;
  }) => void;
  fullCascade?: boolean;
  districtLabel?: string;
};

/**
 * Cascading geography selectors backed by Master Data.
 * District → Taluk → Town → Pincode.
 */
export function GeographyCascadeSelect({
  district,
  taluk,
  town,
  pincode,
  onChange,
  fullCascade = true,
  districtLabel = "District *"
}: Props) {
  const { colors } = useTheme();
  const [districts, setDistricts] = useState<MasterDataItem[]>([]);
  const [taluks, setTaluks] = useState<MasterDataItem[]>([]);
  const [towns, setTowns] = useState<MasterDataItem[]>([]);
  const [pincodes, setPincodes] = useState<MasterDataItem[]>([]);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [talukId, setTalukId] = useState<number | null>(null);
  const [townId, setTownId] = useState<number | null>(null);

  useEffect(() => {
    void getMasterItems("DISTRICT").then((items) => {
      setDistricts(items);
      if (district) {
        const hit = items.find((i) => i.label === district);
        if (hit) setDistrictId(hit.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  useEffect(() => {
    if (!fullCascade || districtId == null) {
      setTowns([]);
      return;
    }
    // Towns are parented under districts (taluk is optional mid-level).
    void getMasterItems("TOWN", { parentId: districtId }).then(setTowns);
  }, [districtId, fullCascade]);

  useEffect(() => {
    if (!fullCascade || districtId == null) {
      setTaluks([]);
      return;
    }
    void getMasterItems("TALUK", { parentId: districtId }).then(setTaluks);
  }, [districtId, fullCascade]);

  useEffect(() => {
    if (!fullCascade || townId == null) {
      setPincodes([]);
      return;
    }
    void getMasterItems("PINCODE", { parentId: townId }).then((items) => {
      setPincodes(items);
      if (items.length === 1) {
        onChange({
          district,
          districtId,
          taluk,
          talukId,
          town,
          townId,
          pincode: items[0].label,
          pincodeId: items[0].id
        });
      }
    });
    // intentionally omit onChange to avoid loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [townId, fullCascade]);

  const districtOptions = useMemo(
    () => districts.map((d) => ({ label: d.label, value: d.label })),
    [districts]
  );
  const talukOptions = useMemo(
    () => taluks.map((d) => ({ label: d.label, value: d.label })),
    [taluks]
  );
  const townOptions = useMemo(
    () => towns.map((d) => ({ label: d.label, value: d.label })),
    [towns]
  );
  const pincodeOptions = useMemo(
    () => pincodes.map((d) => ({ label: d.label, value: d.label })),
    [pincodes]
  );

  return (
    <View style={styles.wrap}>
      <Dropdown
        placeholder={districtLabel}
        value={district}
        options={districtOptions}
        onSelect={(v) => {
          const hit = districts.find((d) => d.label === v);
          setDistrictId(hit?.id ?? null);
          setTalukId(null);
          setTownId(null);
          onChange({
            district: v,
            districtId: hit?.id ?? null,
            taluk: "",
            talukId: null,
            town: "",
            townId: null,
            pincode: "",
            pincodeId: null
          });
        }}
      />
      {fullCascade ? (
        <>
          {talukOptions.length > 0 ? (
            <Dropdown
              placeholder="Taluk"
              value={taluk}
              options={talukOptions}
              onSelect={(v) => {
                const hit = taluks.find((d) => d.label === v);
                setTalukId(hit?.id ?? null);
                setTownId(null);
                onChange({
                  district,
                  districtId,
                  taluk: v,
                  talukId: hit?.id ?? null,
                  town: "",
                  townId: null,
                  pincode: "",
                  pincodeId: null
                });
              }}
            />
          ) : null}
          {townOptions.length > 0 ? (
            <Dropdown
              placeholder="City / Town"
              value={town}
              options={townOptions}
              onSelect={(v) => {
                const hit = towns.find((d) => d.label === v);
                setTownId(hit?.id ?? null);
                onChange({
                  district,
                  districtId,
                  taluk,
                  talukId,
                  town: v,
                  townId: hit?.id ?? null,
                  pincode: "",
                  pincodeId: null
                });
              }}
            />
          ) : null}
          {pincodeOptions.length > 0 ? (
            <Dropdown
              placeholder="Pincode"
              value={pincode}
              options={pincodeOptions}
              onSelect={(v) => {
                const hit = pincodes.find((d) => d.label === v);
                onChange({
                  district,
                  districtId,
                  taluk,
                  talukId,
                  town,
                  townId,
                  pincode: v,
                  pincodeId: hit?.id ?? null
                });
              }}
            />
          ) : null}
          {districtId && taluks.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              Taluks for this district can be added in Admin → Master Data.
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm }
});
