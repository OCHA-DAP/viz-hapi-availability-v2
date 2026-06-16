export const categoryLabels = {
  'affected-people': 'Affected People',
  'coordination-context': 'Coordination & Context',
  'food-security-nutrition-poverty': 'Food Security, Nutrition & Poverty',
  'geography-infrastructure': 'Geography & Infrastructure',
  'climate': 'Climate'
};

export const subcategoryLabels = {
  'humanitarian-needs': 'Humanitarian Needs',
  'idps': 'Internally-Displaced Persons',
  'refugees-persons-of-concern': 'Refugees & Persons of Concern',
  'returnees': 'Returnees',
  'conflict-events': 'Conflict Events',
  'funding': 'Funding',
  'national-risk': 'National Risk',
  'operational-presence': 'Who Is Doing What Where - Operational Presence',
  'food-prices-market-monitor': 'Food Prices',
  'food-security': 'Food Security',
  'poverty-rate': 'Poverty Rate',
  'baseline-population': 'Baseline Population',
  'hazards-rainfall': 'Rainfall'
};

export const categories = {
  'Affected People': ['Humanitarian Needs', 'Internally-Displaced Persons', 'Refugees & Persons of Concern', 'Returnees'],
  'Climate': ['Rainfall'],
  'Coordination & Context': ['Conflict Events', 'Funding', 'National Risk', 'Who Is Doing What Where - Operational Presence'],
  'Food Security, Nutrition & Poverty': ['Food Prices', 'Food Security', 'Poverty Rate'],
  'Geography & Infrastructure': ['Baseline Population']
};

export const sandboxBaseURL = 'https://hapi.humdata.org/docs#';

export const sandboxURL = {
  'Humanitarian Needs': `${sandboxBaseURL}/Affected%20People/get_humanitarian_needs_api_v2_affected_people_humanitarian_needs_get`,
  'Internally-Displaced Persons': `${sandboxBaseURL}/Affected%20People/get_idps_api_v2_affected_people_idps_get`,
  'Refugees & Persons of Concern': `${sandboxBaseURL}/Affected%20People/get_refugees_api_v2_affected_people_refugees_persons_of_concern_get`,
  'Returnees': `${sandboxBaseURL}/Affected%20People/get_returnees_api_v2_affected_people_returnees_get`,
  'Conflict Events': `${sandboxBaseURL}/Coordination%20&%20Context/get_conflict_event_api_v2_coordination_context_conflict_events_get`,
  'Funding': `${sandboxBaseURL}/Coordination%20&%20Context/get_funding_api_v2_coordination_context_funding_get`,
  'National Risk': `${sandboxBaseURL}/Coordination%20&%20Context/get_national_risk_api_v2_coordination_context_national_risk_get`,
  'Who Is Doing What Where - Operational Presence': `${sandboxBaseURL}/Coordination%20&%20Context/get_operational_presence_api_v2_coordination_context_operational_presence_get`,
  'Food Prices': `${sandboxBaseURL}/Food%20Security,%20Nutrition%20&%20Poverty/get_food_price_api_v2_food_security_nutrition_poverty_food_prices_market_monitor_get`,
  'Food Security': `${sandboxBaseURL}/Food%20Security,%20Nutrition%20&%20Poverty/get_food_security_api_v2_food_security_nutrition_poverty_food_security_get`,
  'Poverty Rate': `${sandboxBaseURL}/Food%20Security,%20Nutrition%20&%20Poverty/get_poverty_rate_api_v2_food_security_nutrition_poverty_poverty_rate_get`,
  'Baseline Population': `${sandboxBaseURL}/Geography%20&%20Infrastructure/get_population_api_v2_geography_infrastructure_baseline_population_get`,
  'Rainfall': `${sandboxBaseURL}/Climate/get_rainfall_api_v2_climate_rainfall_get`
};
