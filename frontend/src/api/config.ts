import client from './client';
import type { EvaluationConfig } from '../types';

export async function getConfig(): Promise<EvaluationConfig> {
  const res = await client.get<{ config_data: EvaluationConfig }>('/evaluation-config');
  return res.data.config_data;
}

export async function saveConfig(config: EvaluationConfig): Promise<EvaluationConfig> {
  const res = await client.put<{ config_data: EvaluationConfig }>('/evaluation-config', {
    config_data: config,
  });
  return res.data.config_data;
}
