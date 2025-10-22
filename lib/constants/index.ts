export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Porfolio Optimization System"
export const APP_DESCRIPTION = process.env.NEXT_PUBLIC_APP_DESCRIPTION || "A web application for portfolio optimization and management."
export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"

export const signInDefaultValues = {
    email: "",
    password: "",
}

export const signUpDefaultValues = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export const NAV_ITEMS = [
    { href: '/', label: 'Dashboard' },
    { href: '/search', label: 'Search' },
    // { href: '/watchlist', label: 'Watchlist' },
];

// Sign-up form select options
export const INVESTMENT_GOALS = [
    { value: 'Growth', label: 'Growth' },
    { value: 'Income', label: 'Income' },
    { value: 'Balanced', label: 'Balanced' },
    { value: 'Conservative', label: 'Conservative' },
];

export const RISK_TOLERANCE_OPTIONS = [
    { value: 'Low', label: 'Low' },
    { value: 'Medium', label: 'Medium' },
    { value: 'High', label: 'High' },
];

export const PREFERRED_INDUSTRIES = [
    { value: 'Technology', label: 'Technology' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Energy', label: 'Energy' },
    { value: 'Consumer Goods', label: 'Consumer Goods' },
];

export const ALERT_TYPE_OPTIONS = [
    { value: 'upper', label: 'Upper' },
    { value: 'lower', label: 'Lower' },
];

export const CONDITION_OPTIONS = [
    { value: 'greater', label: 'Greater than (>)' },
    { value: 'less', label: 'Less than (<)' },
];

// TradingView Charts - Nairobi Stock Exchange (NSE)
export const MARKET_OVERVIEW_WIDGET_CONFIG = {
    colorTheme: 'dark', // dark mode
    dateRange: '12M', // last 12 months
    locale: 'en', // language
    largeChartUrl: '', // link to a large chart if needed
    isTransparent: true, // makes background transparent
    showFloatingTooltip: true, // show tooltip on hover
    plotLineColorGrowing: '#0FEDBE', // line color when price goes up
    plotLineColorFalling: '#0FEDBE', // line color when price falls
    gridLineColor: 'rgba(240, 243, 250, 0)', // grid line color
    scaleFontColor: '#DBDBDB', // font color for scale
    belowLineFillColorGrowing: 'rgba(41, 98, 255, 0.12)', // fill under line when growing
    belowLineFillColorFalling: 'rgba(41, 98, 255, 0.12)', // fill under line when falling
    belowLineFillColorGrowingBottom: 'rgba(41, 98, 255, 0)',
    belowLineFillColorFallingBottom: 'rgba(41, 98, 255, 0)',
    symbolActiveColor: 'rgba(15, 237, 190, 0.05)', // highlight color for active symbol
    tabs: [
        {
            title: 'Banking',
            symbols: [
                { s: 'NSE:EQTY', d: 'Equity Group Holdings' },
                { s: 'NSE:KCB', d: 'KCB Group' },
                { s: 'NSE:ABSA', d: 'Absa Bank Kenya' },
                { s: 'NSE:COOP', d: 'Co-operative Bank' },
                { s: 'NSE:SCBK', d: 'Standard Chartered Bank Kenya' },
                { s: 'NSE:NCBA', d: 'NCBA Group' },
            ],
        },
        {
            title: 'Manufacturing',
            symbols: [
                { s: 'NSE:EABL', d: 'East African Breweries' },
                { s: 'NSE:BAMB', d: 'Bamburi Cement' },
                { s: 'NSE:BAT', d: 'British American Tobacco Kenya' },
                { s: 'NSE:UNGA', d: 'Unga Group' },
                { s: 'NSE:CARB', d: 'Carbacid Investments' },
                { s: 'NSE:BOC', d: 'BOC Kenya' },
            ],
        },
        {
            title: 'Telecom & Energy',
            symbols: [
                { s: 'NSE:SCOM', d: 'Safaricom PLC' },
                { s: 'NSE:KPLC', d: 'Kenya Power & Lighting' },
                { s: 'NSE:KEGN', d: 'KenGen' },
                { s: 'NSE:TOTL', d: 'TotalEnergies Marketing Kenya' },
                { s: 'NSE:KUKZ', d: 'Kakuzi' },
                { s: 'NSE:HAFR', d: 'Hafr Housing' },
            ],
        },
    ],
    support_host: 'https://www.tradingview.com', // TradingView host
    backgroundColor: '#141414', // background color
    width: '100%', // full width
    height: 600, // height in px
    showSymbolLogo: true, // show logo next to symbols
    showChart: true, // display mini chart
};

export const HEATMAP_WIDGET_CONFIG = {
    dataSource: 'AllWorld',
    blockSize: 'market_cap_basic',
    blockColor: 'change',
    grouping: 'sector',
    isTransparent: true,
    locale: 'en',
    symbolUrl: '',
    colorTheme: 'dark',
    exchanges: ['NSE'],
    hasTopBar: false,
    isDataSetEnabled: false,
    isZoomEnabled: true,
    hasSymbolTooltip: true,
    isMonoSize: false,
    width: '100%',
    height: '600',
};

export const TOP_STORIES_WIDGET_CONFIG = {
    displayMode: 'regular',
    feedMode: 'market',
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'en',
    market: 'stock',
    width: '100%',
    height: '600',
};

export const MARKET_DATA_WIDGET_CONFIG = {
    title: 'NSE Stocks',
    width: '100%',
    height: 600,
    locale: 'en',
    showSymbolLogo: true,
    colorTheme: 'dark',
    isTransparent: false,
    backgroundColor: '#0F0F0F',
    symbolsGroups: [
        {
            name: 'Banking',
            symbols: [
                { name: 'NSE:EQTY', displayName: 'Equity Group Holdings' },
                { name: 'NSE:KCB', displayName: 'KCB Group' },
                { name: 'NSE:ABSA', displayName: 'Absa Bank Kenya' },
                { name: 'NSE:COOP', displayName: 'Co-operative Bank' },
                { name: 'NSE:SCBK', displayName: 'Standard Chartered Bank' },
                { name: 'NSE:NCBA', displayName: 'NCBA Group' },
            ],
        },
        {
            name: 'Telecommunications',
            symbols: [
                { name: 'NSE:SCOM', displayName: 'Safaricom PLC' },
            ],
        },
        {
            name: 'Manufacturing & Energy',
            symbols: [
                { name: 'NSE:EABL', displayName: 'East African Breweries' },
                { name: 'NSE:BAMB', displayName: 'Bamburi Cement' },
                { name: 'NSE:BAT', displayName: 'British American Tobacco' },
                { name: 'NSE:KPLC', displayName: 'Kenya Power & Lighting' },
                { name: 'NSE:KEGN', displayName: 'KenGen' },
                { name: 'NSE:TOTL', displayName: 'TotalEnergies Marketing' },
            ],
        },
        {
            name: 'Insurance & Investment',
            symbols: [
                { name: 'NSE:BRIT', displayName: 'Britam Holdings' },
                { name: 'NSE:KUKZ', displayName: 'Kakuzi' },
                { name: 'NSE:CIC', displayName: 'CIC Insurance Group' },
                { name: 'NSE:JBIC', displayName: 'Jubilee Holdings' },
                { name: 'NSE:CTUM', displayName: 'Centum Investment' },
            ],
        },
    ],
};

export const SYMBOL_INFO_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: true,
    locale: 'en',
    width: '100%',
    height: 170,
});

export const CANDLE_CHART_WIDGET_CONFIG = (symbol: string) => ({
    allow_symbol_change: false,
    calendar: false,
    details: true,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale: 'en',
    save_image: false,
    style: 1,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'Etc/UTC',
    backgroundColor: '#141414',
    gridColor: '#141414',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const BASELINE_WIDGET_CONFIG = (symbol: string) => ({
    allow_symbol_change: false,
    calendar: false,
    details: false,
    hide_side_toolbar: true,
    hide_top_toolbar: false,
    hide_legend: false,
    hide_volume: false,
    hotlist: false,
    interval: 'D',
    locale: 'en',
    save_image: false,
    style: 10,
    symbol: symbol.toUpperCase(),
    theme: 'dark',
    timezone: 'Etc/UTC',
    backgroundColor: '#141414',
    gridColor: '#141414',
    watchlist: [],
    withdateranges: false,
    compareSymbols: [],
    studies: [],
    width: '100%',
    height: 600,
});

export const TECHNICAL_ANALYSIS_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'en',
    width: '100%',
    height: 400,
    interval: '1h',
    largeChartUrl: '',
});

export const COMPANY_PROFILE_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'en',
    width: '100%',
    height: 440,
});

export const COMPANY_FINANCIALS_WIDGET_CONFIG = (symbol: string) => ({
    symbol: symbol.toUpperCase(),
    colorTheme: 'dark',
    isTransparent: 'true',
    locale: 'en',
    width: '100%',
    height: 464,
    displayMode: 'regular',
    largeChartUrl: '',
});

export const POPULAR_STOCK_SYMBOLS = [
    // NSE Banking Sector
    'NSE:EQTY',  // Equity Group Holdings
    'NSE:KCB',   // KCB Group
    'NSE:ABSA',  // Absa Bank Kenya
    'NSE:COOP',  // Co-operative Bank
    'NSE:SCBK',  // Standard Chartered Bank Kenya
    'NSE:NCBA',  // NCBA Group
    'NSE:DTBK',  // Diamond Trust Bank
    'NSE:I&M',   // I&M Holdings

    // NSE Telecommunications
    'NSE:SCOM',  // Safaricom PLC

    // NSE Manufacturing & Beverages
    'NSE:EABL',  // East African Breweries
    'NSE:BAMB',  // Bamburi Cement
    'NSE:BAT',   // British American Tobacco Kenya
    'NSE:UNGA',  // Unga Group
    'NSE:CARB',  // Carbacid Investments
    'NSE:BOC',   // BOC Kenya

    // NSE Energy
    'NSE:KPLC',  // Kenya Power & Lighting
    'NSE:KEGN',  // KenGen
    'NSE:TOTL',  // TotalEnergies Marketing Kenya
    'NSE:KENO',  // KenolKobil

    // NSE Insurance
    'NSE:BRIT',  // Britam Holdings
    'NSE:KUKZ',  // Kakuzi
    'NSE:CIC',   // CIC Insurance Group
    'NSE:JBIC',  // Jubilee Holdings
    'NSE:KNRE',  // Kenya Re

    // NSE Investment & Real Estate
    'NSE:CTUM',  // Centum Investment
    'NSE:HAFR',  // Hafr Housing
    'NSE:ILAM',  // I&M Holdings

    // NSE Retail & Commercial
    'NSE:ARM',   // ARM Cement
    'NSE:ATHI',  // Athi River Mining
    'NSE:CABL',  // East African Cables
    'NSE:SMER',  // Sameer Africa
    'NSE:FTGH',  // Flame Tree Group Holdings
];

export const NO_MARKET_NEWS =
    '<p class="mobile-text" style="margin:0 0 20px 0;font-size:16px;line-height:1.6;color:#4b5563;">No market news available today. Please check back tomorrow.</p>';

export const WATCHLIST_TABLE_HEADER = [
    'Company',
    'Symbol',
    'Price',
    'Change',
    'Market Cap',
    'P/E Ratio',
    'Alert',
    'Action',
];
