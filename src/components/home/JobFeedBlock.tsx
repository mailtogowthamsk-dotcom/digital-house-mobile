import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  formatEmploymentType,
  formatJobExperience,
  formatJobSalary,
  formatWorkMode
} from "../../constants/jobs";

export type JobCardFields = {
  title: string;
  description?: string | null;
  jobCompany?: string | null;
  jobLocation?: string | null;
  jobEmploymentType?: string | null;
  jobWorkMode?: string | null;
  jobExperience?: string | null;
  jobSkills?: string[] | null;
  jobSalaryMin?: number | null;
  jobSalaryMax?: number | null;
  jobStatus?: string | null;
  jobInterestedByMe?: boolean;
  timeAgo?: string;
};

type Props = {
  job: JobCardFields;
  onViewJob?: () => void;
  compact?: boolean;
};

function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "teal" | "amber" }) {
  const { colors, mode } = useTheme();
  const bg =
    tone === "teal"
      ? mode === "dark"
        ? "rgba(13,148,136,0.22)"
        : "#CCFBF1"
      : tone === "amber"
        ? mode === "dark"
          ? "rgba(217,119,6,0.22)"
          : "#FEF3C7"
        : mode === "dark"
          ? colors.surfaceElevated
          : "#F1F5F9";
  const fg =
    tone === "teal" ? "#0F766E" : tone === "amber" ? "#B45309" : colors.textSecondary;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function JobFeedBlockInner({ job, onViewJob, compact }: Props) {
  const { colors, mode } = useTheme();
  const salary = formatJobSalary(job.jobSalaryMin, job.jobSalaryMax);
  const employment = formatEmploymentType(job.jobEmploymentType);
  const workMode = formatWorkMode(job.jobWorkMode);
  const experience = formatJobExperience(job.jobExperience);
  const skills = Array.isArray(job.jobSkills) ? job.jobSkills.filter(Boolean) : [];
  const skillPreview = skills.slice(0, 3);
  const skillMore = Math.max(0, skills.length - skillPreview.length);
  const closed = job.jobStatus === "CLOSED";

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          gap: 6
        },
        badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
        jobBadge: {
          backgroundColor: mode === "dark" ? "rgba(37,99,235,0.25)" : "#DBEAFE",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        jobBadgeText: { fontSize: 10, fontWeight: "800", color: "#1D4ED8", letterSpacing: 0.4 },
        applied: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: mode === "dark" ? "rgba(22,163,74,0.2)" : "#DCFCE7",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        appliedText: { fontSize: 11, fontWeight: "700", color: "#15803D" },
        title: { fontSize: 16, fontWeight: "800", color: colors.text, lineHeight: 21 },
        companyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
        logo: {
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: mode === "dark" ? "#1E3A5F" : "#EFF6FF",
          alignItems: "center",
          justifyContent: "center"
        },
        logoText: { fontSize: 11, fontWeight: "800", color: "#2563EB" },
        company: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.textSecondary },
        metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" },
        metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
        metaText: { fontSize: 12, color: colors.textMuted },
        salary: { fontSize: 13, fontWeight: "700", color: colors.primary },
        desc: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
        chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
        actions: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4
        },
        viewBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: colors.primary,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.md
        },
        viewBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
        posted: { fontSize: 11, color: colors.textMuted }
      }),
    [colors, mode]
  );

  const initials = (job.jobCompany || job.title || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={s.wrap}>
      <View style={s.badgeRow}>
        <View style={s.jobBadge}>
          <Text style={s.jobBadgeText}>JOB</Text>
        </View>
        {closed ? <Chip label="Closed" tone="amber" /> : null}
        {job.jobInterestedByMe ? (
          <View style={s.applied}>
            <Ionicons name="checkmark-circle" size={12} color="#15803D" />
            <Text style={s.appliedText}>Applied</Text>
          </View>
        ) : null}
      </View>

      <Text style={s.title} numberOfLines={2}>
        {job.title}
      </Text>

      <View style={s.companyRow}>
        <View style={s.logo}>
          <Text style={s.logoText}>{initials || "JB"}</Text>
        </View>
        <Text style={s.company} numberOfLines={1}>
          {job.jobCompany?.trim() || "Company not listed"}
        </Text>
      </View>

      <View style={s.metaRow}>
        {job.jobLocation ? (
          <View style={s.metaItem}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text style={s.metaText}>{job.jobLocation}</Text>
          </View>
        ) : null}
        {salary ? <Text style={s.salary}>{salary}</Text> : null}
      </View>

      <View style={s.chips}>
        {employment ? <Chip label={employment} tone="teal" /> : null}
        {workMode ? <Chip label={workMode} /> : null}
        {experience ? <Chip label={experience} /> : null}
      </View>

      {skillPreview.length > 0 ? (
        <View style={s.chips}>
          {skillPreview.map((sk) => (
            <Chip key={sk} label={sk} />
          ))}
          {skillMore > 0 ? <Chip label={`+${skillMore} more`} /> : null}
        </View>
      ) : null}

      {job.description && !compact ? (
        <Text style={s.desc} numberOfLines={2}>
          {job.description}
        </Text>
      ) : null}

      <View style={s.actions}>
        {job.timeAgo ? <Text style={s.posted}>Posted {job.timeAgo}</Text> : <View />}
        {onViewJob ? (
          <Pressable
            onPress={onViewJob}
            style={({ pressed }) => [s.viewBtn, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
            accessibilityLabel="View job"
          >
            <Text style={s.viewBtnText}>View Job</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const JobFeedBlock = memo(JobFeedBlockInner);

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  chipText: { fontSize: 11, fontWeight: "600" }
});
