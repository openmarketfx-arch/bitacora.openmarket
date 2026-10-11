-- ============================================================
-- Open Market — Seed del catálogo de instrumentos del sistema
-- user_id = NULL  ->  visible para todos los usuarios, no editable.
-- Idempotente: se puede re-ejecutar sin duplicar.
-- ============================================================

insert into public.instruments (user_id, simbolo, nombre, asset_class, decimales_precio, valor_pip)
values
  -- ---------- FOREX: mayores ----------
  (null, 'EURUSD', 'Euro / Dólar estadounidense',        'forex', 5, 0.0001),
  (null, 'GBPUSD', 'Libra esterlina / Dólar',            'forex', 5, 0.0001),
  (null, 'USDJPY', 'Dólar / Yen japonés',                'forex', 3, 0.01),
  (null, 'USDCHF', 'Dólar / Franco suizo',               'forex', 5, 0.0001),
  (null, 'USDCAD', 'Dólar / Dólar canadiense',           'forex', 5, 0.0001),
  (null, 'AUDUSD', 'Dólar australiano / Dólar',          'forex', 5, 0.0001),
  (null, 'NZDUSD', 'Dólar neozelandés / Dólar',          'forex', 5, 0.0001),

  -- ---------- FOREX: cruces ----------
  (null, 'EURGBP', 'Euro / Libra esterlina',             'forex', 5, 0.0001),
  (null, 'EURJPY', 'Euro / Yen japonés',                 'forex', 3, 0.01),
  (null, 'GBPJPY', 'Libra esterlina / Yen japonés',      'forex', 3, 0.01),
  (null, 'AUDJPY', 'Dólar australiano / Yen japonés',    'forex', 3, 0.01),
  (null, 'CADJPY', 'Dólar canadiense / Yen japonés',     'forex', 3, 0.01),
  (null, 'CHFJPY', 'Franco suizo / Yen japonés',         'forex', 3, 0.01),
  (null, 'NZDJPY', 'Dólar neozelandés / Yen japonés',    'forex', 3, 0.01),
  (null, 'EURAUD', 'Euro / Dólar australiano',           'forex', 5, 0.0001),
  (null, 'EURCAD', 'Euro / Dólar canadiense',            'forex', 5, 0.0001),
  (null, 'EURCHF', 'Euro / Franco suizo',                'forex', 5, 0.0001),
  (null, 'EURNZD', 'Euro / Dólar neozelandés',           'forex', 5, 0.0001),
  (null, 'GBPAUD', 'Libra esterlina / Dólar australiano','forex', 5, 0.0001),
  (null, 'GBPCAD', 'Libra esterlina / Dólar canadiense', 'forex', 5, 0.0001),
  (null, 'GBPCHF', 'Libra esterlina / Franco suizo',     'forex', 5, 0.0001),
  (null, 'GBPNZD', 'Libra esterlina / Dólar neozelandés','forex', 5, 0.0001),
  (null, 'AUDCAD', 'Dólar australiano / Dólar canadiense','forex',5, 0.0001),
  (null, 'AUDCHF', 'Dólar australiano / Franco suizo',   'forex', 5, 0.0001),
  (null, 'AUDNZD', 'Dólar australiano / Dólar neozelandés','forex',5,0.0001),
  (null, 'CADCHF', 'Dólar canadiense / Franco suizo',    'forex', 5, 0.0001),
  (null, 'NZDCAD', 'Dólar neozelandés / Dólar canadiense','forex',5, 0.0001),
  (null, 'NZDCHF', 'Dólar neozelandés / Franco suizo',   'forex', 5, 0.0001),

  -- ---------- METALES (se operan como forex) ----------
  (null, 'XAUUSD', 'Oro / Dólar',                        'forex', 2, 0.1),
  (null, 'XAGUSD', 'Plata / Dólar',                      'forex', 3, 0.001),

  -- ---------- CRIPTO ----------
  (null, 'BTCUSD',  'Bitcoin / Dólar',                   'crypto', 2, null),
  (null, 'ETHUSD',  'Ethereum / Dólar',                  'crypto', 2, null),
  (null, 'SOLUSD',  'Solana / Dólar',                    'crypto', 3, null),
  (null, 'XRPUSD',  'XRP / Dólar',                       'crypto', 4, null),
  (null, 'BNBUSD',  'BNB / Dólar',                       'crypto', 2, null),
  (null, 'ADAUSD',  'Cardano / Dólar',                   'crypto', 4, null),
  (null, 'DOGEUSD', 'Dogecoin / Dólar',                  'crypto', 5, null),
  (null, 'AVAXUSD', 'Avalanche / Dólar',                 'crypto', 3, null),
  (null, 'LINKUSD', 'Chainlink / Dólar',                 'crypto', 3, null),
  (null, 'DOTUSD',  'Polkadot / Dólar',                  'crypto', 3, null),
  (null, 'LTCUSD',  'Litecoin / Dólar',                  'crypto', 2, null),
  (null, 'MATICUSD','Polygon / Dólar',                   'crypto', 5, null),

  -- ---------- ÍNDICES ----------
  (null, 'US30',   'Dow Jones 30',                       'index', 2, null),
  (null, 'NAS100', 'Nasdaq 100',                         'index', 2, null),
  (null, 'SPX500', 'S&P 500',                            'index', 2, null),
  (null, 'US2000', 'Russell 2000',                       'index', 2, null),
  (null, 'GER40',  'DAX 40 (Alemania)',                  'index', 2, null),
  (null, 'UK100',  'FTSE 100 (Reino Unido)',             'index', 2, null),
  (null, 'FRA40',  'CAC 40 (Francia)',                   'index', 2, null),
  (null, 'EU50',   'Euro Stoxx 50',                      'index', 2, null),
  (null, 'JPN225', 'Nikkei 225 (Japón)',                 'index', 2, null),
  (null, 'AUS200', 'ASX 200 (Australia)',                'index', 2, null),
  (null, 'HK50',   'Hang Seng 50 (Hong Kong)',           'index', 2, null),
  (null, 'USOIL',  'Petróleo WTI',                       'index', 2, null),

  -- ---------- ACCIONES ----------
  (null, 'AAPL',  'Apple Inc.',                          'stock', 2, null),
  (null, 'MSFT',  'Microsoft Corp.',                     'stock', 2, null),
  (null, 'NVDA',  'NVIDIA Corp.',                        'stock', 2, null),
  (null, 'AMZN',  'Amazon.com Inc.',                     'stock', 2, null),
  (null, 'GOOGL', 'Alphabet Inc. (Clase A)',             'stock', 2, null),
  (null, 'META',  'Meta Platforms Inc.',                 'stock', 2, null),
  (null, 'TSLA',  'Tesla Inc.',                          'stock', 2, null),
  (null, 'NFLX',  'Netflix Inc.',                        'stock', 2, null),
  (null, 'AMD',   'Advanced Micro Devices',              'stock', 2, null),
  (null, 'INTC',  'Intel Corp.',                         'stock', 2, null),
  (null, 'JPM',   'JPMorgan Chase & Co.',                'stock', 2, null),
  (null, 'V',     'Visa Inc.',                           'stock', 2, null),
  (null, 'DIS',   'The Walt Disney Company',             'stock', 2, null),
  (null, 'BA',    'The Boeing Company',                  'stock', 2, null),
  (null, 'KO',    'The Coca-Cola Company',               'stock', 2, null),
  (null, 'PG',    'Procter & Gamble',                    'stock', 2, null),
  (null, 'WMT',   'Walmart Inc.',                        'stock', 2, null),
  (null, 'XOM',   'Exxon Mobil Corp.',                   'stock', 2, null),
  (null, 'COIN',  'Coinbase Global Inc.',                'stock', 2, null),
  (null, 'PLTR',  'Palantir Technologies',               'stock', 2, null)
on conflict do nothing;
