const MINIMUM_CASH = 250_000;
const DEFAULT_RESERVE = 1_600_000;

const asMoney = (value) => Number.isFinite(value) ? Math.max(0, value) : 0;
const roundPercent = (value) => `${Math.round(value * 100)}%`;

/** Dynamic cash reserve used by the computer players. Pure and deterministic. */
export function calculateAIReserve(player, profile = {}) {
  const money = asMoney(player?.money);
  const cap = Number.isFinite(profile.reserve) && profile.reserve >= 0 ? profile.reserve : DEFAULT_RESERVE;
  return Math.min(Math.max(300_000, money * 0.22), cap);
}

/**
 * Evaluate an unowned property without touching game state.
 * The result contains a decision and a human-readable explanation for the log.
 */
export function evaluatePropertyPurchase({ player, tile, index, board = [], assets = [], profile = {}, difficulty = 'cabinet', reserve }) {
  const no = (reason, extra = {}) => ({ shouldBuy: false, score: 0, reason, reasons: [reason], ...extra });
  if (!player || !tile || tile.type !== 'property' || !Number.isInteger(index)) {
    return no('petak ini bukan properti yang bisa dibeli');
  }
  if (assets[index]?.ownerId) return no('properti sudah dimiliki pemain lain');
  if (!Number.isFinite(tile.price) || tile.price <= 0 || !Number.isFinite(tile.rent) || tile.rent < 0) {
    return no('data harga atau sewa properti tidak valid');
  }

  const cash = asMoney(player.money);
  const cashAfter = cash - tile.price;
  const safetyReserve = Number.isFinite(reserve) ? Math.max(0, reserve) : calculateAIReserve(player, profile);
  const requiredCash = difficulty === 'staff'
    ? 350_000
    : difficulty === 'oligarch'
      ? Math.max(MINIMUM_CASH, safetyReserve * 0.6)
      : safetyReserve;
  if (cashAfter < requiredCash) {
    const fmt = new Intl.NumberFormat('id-ID');
    const reason = `menjaga dana cadangan; sisa ${fmt.format(cashAfter)} belum mencapai ${fmt.format(requiredCash)}`;
    return no(reason, { cashAfter, requiredCash, reserve: safetyReserve });
  }

  const region = tile.region;
  const regionTiles = board.map((candidate, tileIndex) => ({ tile: candidate, tileIndex }))
    .filter(({ tile: candidate }) => candidate?.type === 'property' && candidate.region === region);
  const ownedByPlayer = regionTiles.filter(({ tileIndex }) => assets[tileIndex]?.ownerId === player.id);
  const ownedByOthers = regionTiles.filter(({ tileIndex }) => {
    const ownerId = assets[tileIndex]?.ownerId;
    return ownerId && ownerId !== player.id;
  });
  const completesRegion = regionTiles.length > 0 && ownedByPlayer.length === regionTiles.length - 1;
  const rivalIds = [...new Set(ownedByOthers.map(({ tileIndex }) => assets[tileIndex]?.ownerId))];
  const blocksRivalSet = rivalIds.some((rivalId) => regionTiles.filter(({ tileIndex }) => assets[tileIndex]?.ownerId === rivalId).length === regionTiles.length - 1);
  const roi = tile.rent / tile.price;
  const roiScore = roi * 0.29;
  const completionBonus = completesRegion ? 0.035 : 0;
  const progressBonus = Math.min(0.024, ownedByPlayer.length * 0.008);
  const denialBonus = blocksRivalSet ? 0.022 : 0;
  const contestedBonus = ownedByOthers.length > 0 ? 0.004 : 0;
  const liquidityPenalty = cashAfter < safetyReserve * 1.25 ? 0.012 : 0;
  const score = roiScore + completionBonus + progressBonus + denialBonus + contestedBonus - liquidityPenalty;
  const threshold = Number.isFinite(profile.threshold) ? profile.threshold : 0.056;
  const shouldBuy = score >= threshold;

  const reasons = [`rasio sewa/harga ${roundPercent(roi)}`];
  if (completesRegion) reasons.push(`melengkapi wilayah ${region}`);
  else if (ownedByPlayer.length) reasons.push(`menambah penguasaan wilayah ${region}`);
  if (blocksRivalSet) reasons.push(`menghalangi lawan menguasai seluruh wilayah ${region}`);
  if (cashAfter < safetyReserve * 1.25) reasons.push('saldo pasca-pembelian relatif tipis');
  if (!shouldBuy) reasons.push(`nilai strategi ${roundPercent(score)} di bawah ambang ${roundPercent(threshold)}`);

  return {
    shouldBuy, score, threshold, roi, cashAfter, requiredCash, reserve: safetyReserve,
    completesRegion, blocksRivalSet,
    reason: shouldBuy ? reasons.slice(0, 3).join('; ') : reasons[reasons.length - 1],
    reasons,
  };
}

/** Evaluate a house upgrade for a completed region. */
export function evaluateHouseInvestment({ player, tile, asset, profile = {}, difficulty = 'cabinet', reserve, houseCost = 1_000_000, maxHouses = 3, completeRegion = false, round = 1 }) {
  const no = (reason, extra = {}) => ({ shouldBuild: false, score: 0, reason, ...extra });
  if (!player || !tile || tile.type !== 'property' || !asset || asset.ownerId !== player.id) {
    return no('tanah belum menjadi milik pemain ini');
  }
  if (!completeRegion) return no('wilayah harus dikuasai penuh sebelum membangun rumah');
  if (asset.houses >= maxHouses) return no('jumlah rumah sudah mencapai batas');
  if (!Number.isFinite(houseCost) || houseCost <= 0 || !Number.isFinite(tile.rent) || tile.rent < 0) {
    return no('data biaya rumah atau sewa tidak valid');
  }
  if (!(asset.houses < 1 || difficulty === 'oligarch' || (difficulty === 'cabinet' && round > 2))) {
    return no('menunda ekspansi sampai pendapatan wilayah lebih matang');
  }

  const cash = asMoney(player.money);
  const cashAfter = cash - houseCost;
  const safetyReserve = Number.isFinite(reserve) ? Math.max(0, reserve) : calculateAIReserve(player, profile);
  const requiredCash = Math.max(MINIMUM_CASH, safetyReserve * (difficulty === 'oligarch' ? 0.5 : 1));
  if (cashAfter < requiredCash) {
    const fmt = new Intl.NumberFormat('id-ID');
    return no(`menjaga dana cadangan; sisa setelah membangun ${fmt.format(cashAfter)} di bawah target ${fmt.format(requiredCash)}`, { cashAfter, requiredCash, reserve: safetyReserve });
  }

  const incrementalRent = tile.rent * 1.2;
  const score = (incrementalRent / houseCost) * 0.1 + Math.min(asset.houses, 2) * 0.006;
  const threshold = Number.isFinite(profile.threshold) ? profile.threshold : 0.056;
  const shouldBuild = score >= threshold;
  const reason = shouldBuild
    ? `potensi tambahan sewa ${new Intl.NumberFormat('id-ID').format(incrementalRent)} per kunjungan; dana cadangan tetap aman`
    : `nilai investasi ${roundPercent(score)} di bawah ambang ${roundPercent(threshold)}`;
  return { shouldBuild, score, threshold, cashAfter, requiredCash, reserve: safetyReserve, incrementalRent, reason };
}
