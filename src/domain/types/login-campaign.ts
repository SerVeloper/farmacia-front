export interface LoginCampaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  image: string;
  description?: string;
}

export interface LoginCampaignFallback {
  id: string;
  name: string;
  image: string;
  description?: string;
}

export interface LoginCampaignConfig {
  timezone?: string;
  campaigns: LoginCampaign[];
  fallback: LoginCampaignFallback;
}

export type ActiveLoginCampaign = LoginCampaign | LoginCampaignFallback;
