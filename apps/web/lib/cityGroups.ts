import type { Station } from '@chili/shared';

/** 城市分组 key：省 + 城市名。同省不同城市（如广州/深圳）保持独立。 */
export function cityGroupKey(station: Station) {
  return `${station.provinceAdcode ?? station.provinceName}:${station.cityName}`;
}
