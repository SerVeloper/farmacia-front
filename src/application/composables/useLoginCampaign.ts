import { computed, onMounted, ref } from 'vue';

import type {
  ActiveLoginCampaign,
  LoginCampaign,
  LoginCampaignConfig,
  LoginCampaignFallback,
} from '@/domain/types/login-campaign';

const CAMPAIGNS_CONFIG_URL = '/config/login-campaigns.json';
const DEFAULT_TIMEZONE = 'America/La_Paz';

const DEFAULT_FALLBACK: LoginCampaignFallback = {
  id: 'institucional',
  name: 'Campaña Institucional',
  image: '/campaigns/campana-institucional.jpg',
  description: 'Plataforma empresarial de gestión farmacéutica.',
};

function isMonthDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{2}-\d{2}$/.test(value);
}

function monthDayToOrdinal(monthDay: string): number | null {
  const [monthRaw, dayRaw] = monthDay.split('-').map((part) => Number(part));
  const date = new Date(Date.UTC(2000, monthRaw - 1, dayRaw));

  if (
    Number.isNaN(monthRaw) ||
    Number.isNaN(dayRaw) ||
    date.getUTCMonth() !== monthRaw - 1 ||
    date.getUTCDate() !== dayRaw
  ) {
    return null;
  }

  const firstDay = new Date(Date.UTC(2000, 0, 1));
  const diffInMs = date.getTime() - firstDay.getTime();
  return Math.floor(diffInMs / 86400000) + 1;
}

function isDateInRange(today: string, startDate: string, endDate: string): boolean {
  const todayOrdinal = monthDayToOrdinal(today);
  const startOrdinal = monthDayToOrdinal(startDate);
  const endOrdinal = monthDayToOrdinal(endDate);

  if (todayOrdinal === null || startOrdinal === null || endOrdinal === null) {
    return false;
  }

  if (startOrdinal <= endOrdinal) {
    return todayOrdinal >= startOrdinal && todayOrdinal <= endOrdinal;
  }

  return todayOrdinal >= startOrdinal || todayOrdinal <= endOrdinal;
}

function getMonthDayInTimezone(timezone = DEFAULT_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(new Date());
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!month || !day) {
    return '01-01';
  }

  return `${month}-${day}`;
}

function normalizeCampaign(campaign: unknown): LoginCampaign | null {
  if (!campaign || typeof campaign !== 'object') {
    return null;
  }

  const candidate = campaign as Partial<LoginCampaign>;

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.image !== 'string' ||
    !isMonthDay(candidate.startDate) ||
    !isMonthDay(candidate.endDate)
  ) {
    return null;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    image: candidate.image,
    startDate: candidate.startDate,
    endDate: candidate.endDate,
    description: typeof candidate.description === 'string' ? candidate.description : undefined,
  };
}

function normalizeFallback(fallback: unknown): LoginCampaignFallback {
  if (!fallback || typeof fallback !== 'object') {
    return DEFAULT_FALLBACK;
  }

  const candidate = fallback as Partial<LoginCampaignFallback>;

  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || typeof candidate.image !== 'string') {
    return DEFAULT_FALLBACK;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    image: candidate.image,
    description: typeof candidate.description === 'string' ? candidate.description : DEFAULT_FALLBACK.description,
  };
}

function parseConfig(input: unknown): LoginCampaignConfig {
  if (!input || typeof input !== 'object') {
    return {
      timezone: DEFAULT_TIMEZONE,
      campaigns: [],
      fallback: DEFAULT_FALLBACK,
    };
  }

  const candidate = input as Partial<LoginCampaignConfig>;
  const normalizedCampaigns = Array.isArray(candidate.campaigns)
    ? candidate.campaigns.map(normalizeCampaign).filter((item): item is LoginCampaign => item !== null)
    : [];

  return {
    timezone: typeof candidate.timezone === 'string' ? candidate.timezone : DEFAULT_TIMEZONE,
    campaigns: normalizedCampaigns,
    fallback: normalizeFallback(candidate.fallback),
  };
}

function resolveActiveCampaign(campaigns: LoginCampaign[], todayMonthDay: string): LoginCampaign | null {
  return campaigns.find((campaign) => isDateInRange(todayMonthDay, campaign.startDate, campaign.endDate)) ?? null;
}

export function useLoginCampaign() {
  const campaign = ref<ActiveLoginCampaign>(DEFAULT_FALLBACK);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function loadCampaign() {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(CAMPAIGNS_CONFIG_URL, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`No se pudo cargar la configuración de campañas (${response.status}).`);
      }

      const rawConfig = (await response.json()) as unknown;
      const config = parseConfig(rawConfig);
      const today = getMonthDayInTimezone(config.timezone ?? DEFAULT_TIMEZONE);
      const active = resolveActiveCampaign(config.campaigns, today);

      campaign.value = active ?? config.fallback;
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : 'No se pudo resolver la campaña de login.';
      campaign.value = DEFAULT_FALLBACK;
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(() => {
    void loadCampaign();
  });

  const imageUrl = computed(() => campaign.value.image || DEFAULT_FALLBACK.image);
  const campaignName = computed(() => campaign.value.name || DEFAULT_FALLBACK.name);
  const campaignDescription = computed(() => campaign.value.description || DEFAULT_FALLBACK.description || '');

  return {
    campaign,
    imageUrl,
    campaignName,
    campaignDescription,
    isLoading,
    error,
    loadCampaign,
    fallbackImage: DEFAULT_FALLBACK.image,
  };
}
