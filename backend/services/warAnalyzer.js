const { fetchNewsForCountry } = require('./newsFetcher');

const COUNTRY_PROFILES = {
  'United States of America': { defense: 98, powerProjection: 98, air: 96, naval: 98, cyber: 94, logistics: 97, resilience: 88, allies: 95, nuclear: true, terrain: 74 },
  China: { defense: 92, powerProjection: 86, air: 88, naval: 90, cyber: 90, logistics: 87, resilience: 86, allies: 68, nuclear: true, terrain: 78 },
  Russia: { defense: 84, powerProjection: 78, air: 76, naval: 72, cyber: 83, logistics: 67, resilience: 74, allies: 58, nuclear: true, terrain: 82 },
  Ukraine: { defense: 68, powerProjection: 38, air: 44, naval: 24, cyber: 61, logistics: 58, resilience: 87, allies: 81, nuclear: false, terrain: 73 },
  Israel: { defense: 88, powerProjection: 70, air: 94, naval: 60, cyber: 91, logistics: 78, resilience: 72, allies: 79, nuclear: true, terrain: 67 },
  Iran: { defense: 71, powerProjection: 62, air: 54, naval: 50, cyber: 70, logistics: 60, resilience: 76, allies: 63, nuclear: false, terrain: 75 },
  Taiwan: { defense: 66, powerProjection: 32, air: 62, naval: 58, cyber: 83, logistics: 61, resilience: 71, allies: 79, nuclear: false, terrain: 70 },
  'North Korea': { defense: 61, powerProjection: 35, air: 39, naval: 32, cyber: 72, logistics: 41, resilience: 64, allies: 42, nuclear: true, terrain: 72 },
  'South Korea': { defense: 82, powerProjection: 58, air: 82, naval: 78, cyber: 76, logistics: 82, resilience: 77, allies: 85, nuclear: false, terrain: 68 },
  India: { defense: 86, powerProjection: 74, air: 78, naval: 76, cyber: 74, logistics: 75, resilience: 83, allies: 69, nuclear: true, terrain: 84 },
  Pakistan: { defense: 67, powerProjection: 49, air: 61, naval: 37, cyber: 58, logistics: 54, resilience: 68, allies: 61, nuclear: true, terrain: 76 },
  Japan: { defense: 78, powerProjection: 59, air: 82, naval: 88, cyber: 80, logistics: 84, resilience: 75, allies: 92, nuclear: false, terrain: 64 },
  Germany: { defense: 69, powerProjection: 48, air: 62, naval: 46, cyber: 72, logistics: 80, resilience: 78, allies: 89, nuclear: false, terrain: 61 },
  France: { defense: 79, powerProjection: 75, air: 80, naval: 79, cyber: 77, logistics: 82, resilience: 76, allies: 85, nuclear: true, terrain: 63 },
  'United Kingdom': { defense: 77, powerProjection: 80, air: 78, naval: 83, cyber: 85, logistics: 84, resilience: 73, allies: 88, nuclear: true, terrain: 58 }
};

const RELATIONSHIPS = {
  'Russia|Ukraine': -95,
  'Israel|Iran': -92,
  'China|Taiwan': -93,
  'North Korea|South Korea': -96,
  'United States of America|China': -74,
  'India|Pakistan': -90,
  'United States of America|Russia': -84,
  'United States of America|Iran': -78,
  'Israel|Hezbollah': -94,
  'China|Japan': -58
};

function normalizeCountry(country) {
  return country?.trim() || '';
}

function getRelationshipScore(countryA, countryB) {
  const pair = [countryA, countryB].sort().join('|');
  return RELATIONSHIPS[pair] ?? -35;
}

function getFallbackProfile(country) {
  const seed = country.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return {
    defense: 48 + (seed % 22),
    powerProjection: 30 + (seed % 18),
    air: 35 + (seed % 20),
    naval: 28 + (seed % 20),
    cyber: 34 + (seed % 24),
    logistics: 36 + (seed % 18),
    resilience: 50 + (seed % 20),
    allies: 40 + (seed % 22),
    nuclear: false,
    terrain: 55 + (seed % 15)
  };
}

function getCountryProfile(country) {
  return COUNTRY_PROFILES[country] ?? getFallbackProfile(country);
}

function inferPressure(countryIntel) {
  const defcon = countryIntel?.defcon ?? 5;
  const articleText = (countryIntel?.articles ?? [])
    .map((article) => article.title.toLowerCase())
    .join(' ');

  let pressure = (6 - defcon) * 8;
  ['mobilization', 'border', 'strike', 'missile', 'drone', 'incursion', 'sanction', 'exercise'].forEach((term) => {
    if (articleText.includes(term)) {
      pressure += 5;
    }
  });

  return Math.min(100, pressure);
}

function calculateWarLikelihood(countryA, countryB, intelA, intelB) {
  const relationPenalty = Math.abs(getRelationshipScore(countryA, countryB));
  const pressureA = inferPressure(intelA);
  const pressureB = inferPressure(intelB);
  const combined = relationPenalty * 0.45 + pressureA * 0.28 + pressureB * 0.27;
  return Math.max(4, Math.min(96, Math.round(combined)));
}

function calculateCompositeScore(profile, localPressure) {
  const nuclearModifier = profile.nuclear ? 5 : 0;
  return (
    profile.defense * 0.2 +
    profile.powerProjection * 0.16 +
    profile.air * 0.14 +
    profile.naval * 0.08 +
    profile.cyber * 0.1 +
    profile.logistics * 0.12 +
    profile.resilience * 0.08 +
    profile.allies * 0.08 +
    profile.terrain * 0.04 +
    localPressure * 0.05 +
    nuclearModifier
  );
}

function likelihoodBand(score) {
  if (score >= 75) {
    return 'High';
  }
  if (score >= 50) {
    return 'Elevated';
  }
  if (score >= 30) {
    return 'Guarded';
  }
  return 'Low';
}

function confidenceBand(delta) {
  if (delta >= 18) {
    return 'High confidence edge';
  }
  if (delta >= 8) {
    return 'Moderate edge';
  }
  return 'Contested outcome';
}

function buildDrivers(countryA, countryB, profileA, profileB, pressureA, pressureB) {
  const drivers = [];

  if (profileA.allies !== profileB.allies) {
    drivers.push(
      profileA.allies > profileB.allies
        ? `${countryA} enters with stronger alliance support and diplomatic backing.`
        : `${countryB} enters with stronger alliance support and diplomatic backing.`
    );
  }

  if (profileA.logistics !== profileB.logistics) {
    drivers.push(
      profileA.logistics > profileB.logistics
        ? `${countryA} holds the logistics advantage for sustaining a longer campaign.`
        : `${countryB} holds the logistics advantage for sustaining a longer campaign.`
    );
  }

  if (profileA.air !== profileB.air) {
    drivers.push(
      profileA.air > profileB.air
        ? `${countryA} has the stronger airpower profile.`
        : `${countryB} has the stronger airpower profile.`
    );
  }

  if (pressureA !== pressureB) {
    drivers.push(
      pressureA > pressureB
        ? `${countryA} is showing a hotter current escalation signal in live reporting.`
        : `${countryB} is showing a hotter current escalation signal in live reporting.`
    );
  }

  if (profileA.nuclear || profileB.nuclear) {
    drivers.push('Nuclear deterrence sharply raises escalation costs and makes outright victory less clean than the score alone suggests.');
  }

  return drivers.slice(0, 4);
}

async function analyzeWarScenario(countryAInput, countryBInput) {
  const countryA = normalizeCountry(countryAInput);
  const countryB = normalizeCountry(countryBInput);

  if (!countryA || !countryB || countryA === countryB) {
    throw new Error('Select two different countries.');
  }

  const [intelA, intelB] = await Promise.all([
    fetchNewsForCountry(countryA),
    fetchNewsForCountry(countryB)
  ]);

  const profileA = getCountryProfile(countryA);
  const profileB = getCountryProfile(countryB);
  const pressureA = inferPressure(intelA);
  const pressureB = inferPressure(intelB);
  const scoreA = Math.round(calculateCompositeScore(profileA, pressureA));
  const scoreB = Math.round(calculateCompositeScore(profileB, pressureB));
  const delta = Math.abs(scoreA - scoreB);
  const projectedWinner = scoreA === scoreB ? 'Too close to call' : scoreA > scoreB ? countryA : countryB;
  const warLikelihood = calculateWarLikelihood(countryA, countryB, intelA, intelB);

  return {
    countries: [countryA, countryB],
    updatedAt: new Date().toISOString(),
    projectedWinner,
    winnerConfidence: confidenceBand(delta),
    warLikelihood,
    likelihoodBand: likelihoodBand(warLikelihood),
    relationshipPressure: Math.abs(getRelationshipScore(countryA, countryB)),
    summary:
      projectedWinner === 'Too close to call'
        ? `Current conditions suggest a highly contested scenario between ${countryA} and ${countryB}, with no decisive favorite.`
        : `${projectedWinner} currently holds the stronger modeled position because of its force mix, support network, and campaign resilience under current conditions.`,
    rationale: buildDrivers(countryA, countryB, profileA, profileB, pressureA, pressureB),
    scorecard: [
      {
        country: countryA,
        score: scoreA,
        pressure: pressureA,
        strengths: {
          defense: profileA.defense,
          air: profileA.air,
          naval: profileA.naval,
          cyber: profileA.cyber,
          allies: profileA.allies,
          logistics: profileA.logistics
        }
      },
      {
        country: countryB,
        score: scoreB,
        pressure: pressureB,
        strengths: {
          defense: profileB.defense,
          air: profileB.air,
          naval: profileB.naval,
          cyber: profileB.cyber,
          allies: profileB.allies,
          logistics: profileB.logistics
        }
      }
    ],
    disclaimer:
      'This outlook is a heuristic forecast, not a prediction of real-world events. It blends current reporting signals with static capability estimates and should be read as an analytical simulation.'
  };
}

module.exports = { analyzeWarScenario };
