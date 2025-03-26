import { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { FaCheck, FaTimes, FaSpinner, FaChartLine, FaInfoCircle, FaCalendarAlt, FaSearch } from 'react-icons/fa';
import { Line, Bar, ComposedChart, LineChart, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import DatePicker from 'react-datepicker';
import 'react-tabs/style/react-tabs.css';
import 'react-datepicker/dist/react-datepicker.css';

const StockInfoCard = ({ info, currentPrice, analysis, raw }) => {
  // Get price change data if available
  const previousClose = info.previousClose || currentPrice;
  const dailyChange = info.dailyChange !== undefined ? info.dailyChange : (currentPrice - previousClose);
  const dailyChangePercent = info.dailyChangePercent !== undefined ? 
    info.dailyChangePercent : 
    ((currentPrice - previousClose) / previousClose * 100);
  const isPositiveChange = dailyChange >= 0;
  
  // Format earnings date
  const earningsDate = info.nextEarningsDate || info.earningsDate || null;
  const formattedEarningsDate = earningsDate ? 
    new Date(earningsDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
    'N/A';
    
  // Get trading data
  const high52Week = info.high52Week || info.yearHigh || 'N/A';
  const low52Week = info.low52Week || info.yearLow || 'N/A';
  const avgVolume = info.avgVolume || info.averageVolume || 'N/A';
  
  // Get option-related data
  const ivPercentile = info.ivPercentile || info.iv_percentile || (info.iv30 ? Math.round(info.iv30 * 100) : 'N/A');
  const iv30Value = info.iv30 ? (info.iv30 * 100).toFixed(1) + '%' : 'N/A';
  const rv30Value = info.rv30 ? (info.rv30 * 100).toFixed(1) + '%' : 'N/A';
  
  // Format basic company info
  const exchange = info.exchange || '';
  const beta = info.beta || 'N/A';
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-3 border-b border-blue-100 dark:border-blue-800">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{info.name}</h3>
          <div className="flex flex-col items-end">
            <span className="text-xl font-bold text-gray-800 dark:text-white">${currentPrice.toFixed(2)}</span>
            <span className={`text-sm font-medium ${isPositiveChange ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositiveChange ? '+' : ''}{Math.abs(dailyChange).toFixed(2)} ({isPositiveChange ? '+' : '-'}{Math.abs(dailyChangePercent).toFixed(2)}%)
            </span>
          </div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>{info.ticker}</span>
          {exchange && <span className="text-blue-600 dark:text-blue-400 font-medium">{exchange}</span>}
        </div>
      </div>
      
      <div className="p-4">
        {/* Basic Stock Info */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">Sector</p>
            <p className="font-medium text-gray-800 dark:text-white mt-1">{info.sector || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">Industry</p>
            <p className="font-medium text-gray-800 dark:text-white mt-1">{info.industry || 'N/A'}</p>
          </div>
          
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">Market Cap</p>
            <p className="font-medium text-gray-800 dark:text-white mt-1">
              {typeof info.marketCap === 'number' 
                ? `$${(info.marketCap / 1e9).toFixed(2)}B` 
                : info.marketCap || 'N/A'}
            </p>
          </div>
          
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-medium">P/E Ratio</p>
            <p className="font-medium text-gray-800 dark:text-white mt-1">{info.peRatio || 'N/A'}</p>
          </div>
        </div>
        
        {/* Additional Stock Information */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-3 text-sm mb-4">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-300 text-xs uppercase font-medium">52-Week Range</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">
                ${typeof low52Week === 'number' ? low52Week.toFixed(2) : low52Week} - ${typeof high52Week === 'number' ? high52Week.toFixed(2) : high52Week}
              </p>
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-300 text-xs uppercase font-medium">Avg Volume</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">
                {typeof avgVolume === 'number' ? formatNumber(avgVolume) : avgVolume}
              </p>
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
              <p className="text-gray-500 dark:text-gray-300 text-xs uppercase font-medium">Beta</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">
                {typeof beta === 'number' ? beta.toFixed(2) : beta}
              </p>
            </div>
          </div>
          
          {/* Volatility & Options Data */}
          <div className="grid grid-cols-4 gap-3 text-sm">
            <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded border border-blue-200 dark:border-blue-700">
              <p className="text-blue-700 dark:text-blue-300 text-xs uppercase font-medium">Expected Move</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">
                {analysis?.expected_move || 'N/A'}
              </p>
              {raw && 
                <div className="mt-1 pt-1 border-t border-blue-100 dark:border-blue-700 flex justify-between">
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    IV: {raw.iv30 ? (raw.iv30 * 100).toFixed(1) + '%' : 'N/A'}
                  </span>
                  <span className="text-xs text-purple-600 dark:text-purple-400">
                    HV: {raw.rv30 ? (raw.rv30 * 100).toFixed(1) + '%' : 'N/A'}
                  </span>
                </div>
              }
            </div>
            
            <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded border border-blue-200 dark:border-blue-700">
              <p className="text-blue-700 dark:text-blue-300 text-xs uppercase font-medium">IV Percentile</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">
                {typeof ivPercentile === 'number' ? `${ivPercentile}%` : ivPercentile}
              </p>
            </div>
            
            <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded border border-blue-200 dark:border-blue-700">
              <p className="text-blue-700 dark:text-blue-300 text-xs uppercase font-medium">IV/RV Ratio</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">
                {analysis?.iv30_rv30_value ? 
                  <span className={analysis?.iv30_rv30 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {analysis.iv30_rv30_value.toFixed(2)}
                  </span> : 'N/A'}
              </p>
            </div>
            
            <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded border border-blue-200 dark:border-blue-700">
              <p className="text-blue-700 dark:text-blue-300 text-xs uppercase font-medium">Term Structure</p>
              <p className="font-medium text-gray-800 dark:text-white mt-1">
                {analysis?.ts_slope_0_45_value ? 
                  <span className={analysis?.ts_slope_0_45 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {analysis.ts_slope_0_45_value.toFixed(4)}
                  </span> : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StockAnalysisCard = ({ analysis }) => {
  const getRecommendationStatus = () => {
    // Get criteria pass/fail values - these should be BOOLEAN values from the server
    const { avg_volume, iv30_rv30, ts_slope_0_45 } = analysis;
    
    // Detailed debugging of values received from server
    console.log("%c RECOMMENDATION CALCULATION DEBUGGING", "font-weight: bold; font-size: 14px; color: blue;");
    console.log("Raw analysis object received:", analysis);
    console.log("Individual criteria values:");
    console.log("  avg_volume:", avg_volume, "type:", typeof avg_volume);
    console.log("  avg_volume_value:", analysis.avg_volume_value);
    console.log("  iv30_rv30:", iv30_rv30, "type:", typeof iv30_rv30);
    console.log("  iv30_rv30_value:", analysis.iv30_rv30_value);
    console.log("  ts_slope_0_45:", ts_slope_0_45, "type:", typeof ts_slope_0_45);
    console.log("  ts_slope_0_45_value:", analysis.ts_slope_0_45_value);
    console.log("  expected_move:", analysis.expected_move);
    
    // Ensure all values are treated as booleans (in case they're coming as strings)
    const avgVolumeBool = Boolean(avg_volume);
    const iv30rv30Bool = Boolean(iv30_rv30);
    const tsSlope045Bool = Boolean(ts_slope_0_45);
    
    console.log("Normalized boolean values:");
    console.log("  avgVolumeBool:", avgVolumeBool);
    console.log("  iv30rv30Bool:", iv30rv30Bool);
    console.log("  tsSlope045Bool:", tsSlope045Bool);
    
    // Apply the EXACT criteria logic from calculator.py lines 254-262
    let recommendation = "Unknown";
    if (avgVolumeBool && iv30rv30Bool && tsSlope045Bool) {
      recommendation = "Recommended";
    } else if (tsSlope045Bool && ((avgVolumeBool && !iv30rv30Bool) || (iv30rv30Bool && !avgVolumeBool))) {
      recommendation = "Consider";
    } else {
      recommendation = "Avoid";
    }
    
    console.log("Final recommendation:", recommendation);
    console.log("%c END RECOMMENDATION CALCULATION", "font-weight: bold; font-size: 14px; color: blue;");
    
    // Use normalized boolean values to ensure correct calculation
    if (avgVolumeBool && iv30rv30Bool && tsSlope045Bool) {
      return { 
        title: "Recommended", 
        description: "All criteria passed",
        color: "text-green-700 dark:text-green-400", 
        bgColor: "bg-green-100 dark:bg-green-900/30",
        borderColor: "border-green-200 dark:border-green-800",
        icon: "✓"
      };
    } else if (tsSlope045Bool && ((avgVolumeBool && !iv30rv30Bool) || (iv30rv30Bool && !avgVolumeBool))) {
      return { 
        title: "Consider", 
        description: "Some criteria passed",
        color: "text-amber-600 dark:text-amber-400", 
        bgColor: "bg-amber-100 dark:bg-amber-900/30",
        borderColor: "border-amber-200 dark:border-amber-800",
        icon: "!"
      };
    } else {
      return { 
        title: "Avoid", 
        description: "Too many failed criteria",
        color: "text-red-800 dark:text-red-400", 
        bgColor: "bg-red-100 dark:bg-red-900/30",
        borderColor: "border-red-200 dark:border-red-800",
        icon: "✗"
      };
    }
  };

  const status = getRecommendationStatus();
  
  const passCount = [
    analysis.avg_volume,
    analysis.iv30_rv30,
    analysis.ts_slope_0_45
  ].filter(Boolean).length;
  
  const passPercentage = (passCount / 3) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className={`${status.bgColor} px-4 py-3 border-b ${status.borderColor}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-xl font-bold ${status.color}`}>
              {status.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {status.description}
            </p>
          </div>
          <div className={`${status.bgColor} w-12 h-12 rounded-full flex items-center justify-center border-2 ${status.borderColor}`}>
            <span className={`text-xl font-bold ${status.color}`}>{passCount}/3</span>
          </div>
        </div>
      </div>
      
      <div className="p-4">
        {analysis.expected_move && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-center text-gray-700 dark:text-gray-300">
              Expected Move: <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">{analysis.expected_move}</span>
            </p>
          </div>
        )}
        
        <div className="space-y-3 mt-2">
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-transparent dark:hover:bg-gray-750">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Average Volume</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Minimum 1.5M</div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatNumber(analysis.avg_volume_value)}
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${analysis.avg_volume ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                {analysis.avg_volume ? (
                  <FaCheck className="text-green-600 dark:text-green-400" />
                ) : (
                  <FaTimes className="text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-transparent dark:hover:bg-gray-750">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">IV30/RV30 Ratio</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Greater than 1.25</div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {analysis.iv30_rv30_value.toFixed(2)}
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${analysis.iv30_rv30 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                {analysis.iv30_rv30 ? (
                  <FaCheck className="text-green-600 dark:text-green-400" />
                ) : (
                  <FaTimes className="text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-transparent dark:hover:bg-gray-750">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Term Structure Slope</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Less than -0.00406</div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {analysis.ts_slope_0_45_value.toFixed(4)}
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${analysis.ts_slope_0_45 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                {analysis.ts_slope_0_45 ? (
                  <FaCheck className="text-green-600 dark:text-green-400" />
                ) : (
                  <FaTimes className="text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                passPercentage === 100 ? 'bg-green-600 dark:bg-green-500' : 
                passPercentage >= 66 ? 'bg-amber-500 dark:bg-amber-400' : 
                'bg-red-600 dark:bg-red-500'
              }`} 
              style={{ width: `${passPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartSection = ({ chartData, ticker }) => {
  // Log chart data for debugging
  console.log('Chart section received data:', chartData);
  
  // Check if we have data for the charts and provide fallbacks
  const priceHistory = chartData?.priceHistory || [];
  const termStructure = chartData?.termStructure || [];
  const volatility = chartData?.volatility || [];
  const optionData = chartData?.optionData || [];
  
  console.log('Processed chart data:', { 
    priceHistoryLength: priceHistory.length,
    termStructureLength: termStructure.length,
    volatilityLength: volatility.length,
    optionDataLength: optionData.length
  });
  
  const hasPriceHistory = Array.isArray(priceHistory) && priceHistory.length > 0;
  const hasTermStructure = Array.isArray(termStructure) && termStructure.length > 0;
  const hasVolatility = Array.isArray(volatility) && volatility.length > 0;
  
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 px-1">Chart Analysis for {ticker}</h2>
      
      {/* Price History Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            Price History
          </h3>
          {hasPriceHistory ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={priceHistory.slice(-30)} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => {
                      try {
                        const date = new Date(value);
                        return `${date.getMonth()+1}/${date.getDate()}`;
                      } catch (e) {
                        return value;
                      }
                    }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{ fontSize: 10 }}
                    width={40}
                  />
                  <YAxis 
                    yAxisId={1} 
                    orientation="right" 
                    tick={{ fontSize: 10 }} 
                    width={35}
                  />
                  <Tooltip 
                    wrapperStyle={{ zIndex: 1000 }}
                    labelFormatter={(label) => {
                      try {
                        return `Date: ${new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
                      } catch (e) {
                        return `Date: ${label}`;
                      }
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' ? 
                        name === 'Volume' ? value.toLocaleString() : `$${value.toFixed(2)}` : 
                        value, 
                      name
                    ]}
                    itemSorter={(item) => -item.value}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="volume" fill="#8884d8" opacity={0.3} yAxisId={1} name="Volume" />
                  <Line type="monotone" dataKey="close" stroke="#ff7300" dot={false} name="Price" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>Price history data not available</p>
            </div>
          )}
        </div>
          
        {/* Term Structure Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            IV Term Structure
          </h3>
          {hasTermStructure ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={termStructure} margin={{ top: 5, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    dataKey="dte" 
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Days to Expiry', position: 'insideBottom', offset: -15, fontSize: 10 }} 
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{ fontSize: 10 }}
                    width={40}
                    tickFormatter={(value) => typeof value === 'number' ? value.toFixed(2) : value}
                  />
                  <Tooltip 
                    wrapperStyle={{ zIndex: 1000 }}
                    labelFormatter={(label) => `DTE: ${label}`}
                    formatter={(value, name) => {
                      if (typeof value === 'number') {
                        return [`${(value * 100).toFixed(2)}%`, 'Implied Volatility'];
                      }
                      return [value, name];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="iv" 
                    stroke="#82ca9d" 
                    strokeWidth={2}
                    activeDot={{ r: 5 }} 
                    name="Implied Volatility" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>Term structure data not available</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volatility Comparison Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            Volatility Comparison
          </h3>
          {hasVolatility ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volatility} margin={{ top: 5, right: 10, bottom: 30, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    dataKey="window" 
                    tick={{ fontSize: 10 }}
                    label={{ value: 'Window (Days)', position: 'insideBottom', offset: -5, fontSize: 10 }} 
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{ fontSize: 10 }}
                    width={40}
                    tickFormatter={(value) => {
                      if (typeof value === 'number') {
                        return (value * 100).toFixed(0) + '%';
                      }
                      return value;
                    }}
                  />
                  <Tooltip 
                    wrapperStyle={{ zIndex: 1000 }}
                    labelFormatter={(label) => `Window: ${label} Days`}
                    formatter={(value, name) => {
                      if (typeof value === 'number') {
                        return [`${(value * 100).toFixed(2)}%`, name];
                      }
                      return [value, name];
                    }}
                    itemSorter={(item) => -item.value}
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: 10 }} 
                    verticalAlign="top"
                    height={36}
                  />
                  <Bar dataKey="rv" fill="#8884d8" name="Historical Volatility" />
                  {chartData.iv30 && <Bar dataKey="iv" fill="#82ca9d" name="Implied Volatility (30d)" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>Volatility comparison data not available</p>
            </div>
          )}
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 grid grid-cols-3 gap-2">
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <p className="font-medium">IV30</p>
              <p className="text-lg">{chartData?.iv30 && typeof chartData.iv30 === 'number' ? (chartData.iv30 * 100).toFixed(2) + '%' : 'N/A'}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <p className="font-medium">RV30</p>
              <p className="text-lg">{chartData?.rv30 && typeof chartData.rv30 === 'number' ? (chartData.rv30 * 100).toFixed(2) + '%' : 'N/A'}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
              <p className="font-medium">IV/RV Ratio</p>
              <p className="text-lg">{(chartData?.iv30 && chartData?.rv30 && typeof chartData.iv30 === 'number' && typeof chartData.rv30 === 'number') ? (chartData.iv30 / chartData.rv30).toFixed(2) : 'N/A'}</p>
            </div>
          </div>
        </div>
        
        {/* Options Expiration Data */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            Option Expirations
          </h3>
          {optionData && optionData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Expiry</th>
                    <th className="px-3 py-2 text-left">DTE</th>
                    <th className="px-3 py-2 text-left">Strike</th>
                    <th className="px-3 py-2 text-left">Call IV</th>
                    <th className="px-3 py-2 text-left">Put IV</th>
                    <th className="px-3 py-2 text-left">ATM IV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {optionData.map((data, idx) => (
                    <tr key={idx} className="hover:bg-transparent dark:hover:bg-gray-750">
                      <td className="px-3 py-2">{formatDate(data.date)}</td>
                      <td className="px-3 py-2">{data.daysToExpiry}</td>
                      <td className="px-3 py-2">${typeof data.strike === 'number' ? 
                        formatStandardStrike(data.strike)
                        : data.strike}</td>
                      <td className="px-3 py-2">{typeof data.callIV === 'number' ? (data.callIV * 100).toFixed(1) + '%' : data.callIV}</td>
                      <td className="px-3 py-2">{typeof data.putIV === 'number' ? (data.putIV * 100).toFixed(1) + '%' : data.putIV}</td>
                      <td className="px-3 py-2">{typeof data.atmIV === 'number' ? (data.atmIV * 100).toFixed(1) + '%' : data.atmIV}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <p>Options data not available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const UpcomingEarningsTable = ({ earnings, loading, error }) => {
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('asc');
  
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  const sortedEarnings = earnings && earnings.length 
    ? [...earnings].sort((a, b) => {
        if (sortField === 'date') {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        } else if (sortField === 'ticker') {
          return sortDirection === 'asc'
            ? a.ticker.localeCompare(b.ticker)
            : b.ticker.localeCompare(a.ticker);
        } else if (sortField === 'company') {
          return sortDirection === 'asc'
            ? a.company.localeCompare(b.company)
            : b.company.localeCompare(a.company);
        } else if (sortField === 'expectedEPS') {
          const epsA = a.expectedEPS || 0;
          const epsB = b.expectedEPS || 0;
          return sortDirection === 'asc' ? epsA - epsB : epsB - epsA;
        }
        return 0;
      })
    : [];
    
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <FaSpinner className="animate-spin text-blue-500 mr-2" size={20} />
        <p>Loading upcoming earnings...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg">
        <p className="font-medium">Error loading earnings data:</p>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!earnings || earnings.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600 dark:text-gray-400">
        <p>No upcoming earnings data available.</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
        <thead className="bg-gray-100 dark:bg-gray-700">
          <tr>
            <th 
              className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('date')}
            >
              Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('ticker')}
            >
              Ticker {sortField === 'ticker' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('company')}
            >
              Company {sortField === 'company' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Time
            </th>
            <th 
              className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
              onClick={() => handleSort('expectedEPS')}
            >
              Expected EPS {sortField === 'expectedEPS' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedEarnings.map((earning, index) => (
            <tr key={index} className="hover:bg-transparent dark:hover:bg-gray-750">
              <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                {formatDate(earning.date)}
              </td>
              <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200">
                {earning.ticker}
              </td>
              <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                {earning.company}
              </td>
              <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                {earning.time === 'BMO' ? 'Before Market Open' : 
                 earning.time === 'AMC' ? 'After Market Close' : earning.time}
              </td>
              <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200">
                {earning.expectedEPS ? `$${earning.expectedEPS}` : 'N/A'}
              </td>
              <td className="px-4 py-2 text-sm">
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('analyze-ticker', { detail: earning.ticker }))}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Analyze
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Helper functions
const formatNumber = (num) => {
  if (!num && num !== 0) return 'N/A';
  if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
  return num.toFixed(2);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  
  // Create date object from string
  const date = new Date(dateStr);
  
  // Add one day to correct for timezone issue in the data from the server
  const correctedDate = new Date(date);
  correctedDate.setDate(date.getDate() + 1);
  
  return correctedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Format strike prices to standard increments based on price range
const formatStandardStrike = (strike) => {
  // This function rounds the strike to the nearest standard option strike increment
  // and displays it appropriately (with or without decimals)
  
  // No rounding if already a standard strike
  if (Number.isInteger(strike)) {
    return strike.toString();
  }
  
  if (strike < 5) {
    // For very low-priced stocks: $0.05 increments
    const roundedStrike = Math.round(strike * 20) / 20;
    return roundedStrike.toFixed(2);
  } else if (strike < 25) {
    // For low-priced stocks: $0.50 increments
    const roundedStrike = Math.round(strike * 2) / 2;
    return roundedStrike % 1 === 0 ? roundedStrike.toString() : roundedStrike.toFixed(2);
  } else if (strike < 100) {
    // For mid-priced stocks: $1.00 increments or $2.50 increments
    // We'll use $1.00 as it's more common
    const roundedStrike = Math.round(strike);
    return roundedStrike.toString();
  } else if (strike < 200) {
    // For higher-priced stocks: $5.00 increments
    const roundedStrike = Math.round(strike / 5) * 5;
    return roundedStrike.toString();
  } else {
    // For very high-priced stocks: $10.00 increments
    const roundedStrike = Math.round(strike / 10) * 10;
    return roundedStrike.toString();
  }
};

const Earnings = () => {
  const [ticker, setTicker] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // For upcoming earnings tab
  const [earningsData, setEarningsData] = useState([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError] = useState(null);
  const [days, setDays] = useState(7);
  const [sector, setSector] = useState('');
  const [companyCount, setCompanyCount] = useState(15);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Active tab
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  useEffect(() => {
    // Listen for custom events to analyze tickers from the earnings table
    const handleAnalyzeTicker = (event) => {
      if (event.detail) {
        setTicker(event.detail);
        setActiveTabIndex(0); // Switch to analysis tab
        handleSubmit(null, event.detail);
      }
    };
    
    window.addEventListener('analyze-ticker', handleAnalyzeTicker);
    
    return () => {
      window.removeEventListener('analyze-ticker', handleAnalyzeTicker);
    };
  }, []);

  // Test connection function
  const testConnection = async (tickerSymbol) => {
    if (!tickerSymbol) return;
    
    try {
      const response = await fetch(`http://localhost:5000/test/${tickerSymbol.trim().toUpperCase()}`);
      const text = await response.text();
      
      try {
        const data = JSON.parse(text);
        console.log('Test connection data:', data);
        if (data.error) {
          setError(`Test error: ${data.error}`);
        } else {
          // Only show test results if there's an issue with the main analysis
          if (!data.options_available) {
            setError(`No options available for ${tickerSymbol.trim().toUpperCase()}`);
          } else {
            setError(null);
          }
        }
      } catch (parseError) {
        console.error('Failed to parse test JSON:', text);
        setError('Server returned invalid response. Make sure Flask server is running properly.');
      }
    } catch (err) {
      setError(`Connection test failed: ${err.message}`);
    }
  };

  const handleSubmit = async (e, overrideTicker = null) => {
    if (e) e.preventDefault();
    
    const tickerToUse = overrideTicker || ticker;
    if (!tickerToUse.trim()) return;

    setLoading(true);
    setError(null);
    setRecommendation(null);

    try {
      console.log(`Submitting request for ${tickerToUse.trim().toUpperCase()}`);
      
      // Use a simpler endpoint first
      try {
        const simpleResponse = await fetch(`http://localhost:5000/analyze-simple/${tickerToUse.trim().toUpperCase()}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });
        
        if (simpleResponse.ok) {
          const data = await simpleResponse.json();
          console.log('Simple API response:', data);
          console.log('Chart data from simple API:', data.chartData);
          
          // Add default empty arrays for chart data if missing
          if (data.chartData) {
            data.chartData.termStructure = data.chartData.termStructure || [];
            data.chartData.optionData = data.chartData.optionData || [];
            data.chartData.priceHistory = data.chartData.priceHistory || [];
            data.chartData.volatility = data.chartData.volatility || [];
          }
          
          setRecommendation(data);
          return; // Return early with simplified data
        }
      } catch (e) {
        console.log("Simple endpoint not available, trying full endpoint");
      }
      
      // If simple endpoint fails, fall back to full endpoint
      const response = await fetch(`http://localhost:5000/analyze/${tickerToUse.trim().toUpperCase()}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      // Try to parse the response as JSON safely
      let data;
      
      try {
        data = await response.json();
        console.log('Full API response:', data);
        console.log('Chart data from full API:', data.chartData);
        
        // Add default empty arrays for chart data if missing
        if (data.chartData) {
          data.chartData.termStructure = data.chartData.termStructure || [];
          data.chartData.optionData = data.chartData.optionData || [];
          data.chartData.priceHistory = data.chartData.priceHistory || [];
          data.chartData.volatility = data.chartData.volatility || [];
        }
      } catch (parseError) {
        console.error('Parse error details:', parseError);
        
        // Try the test endpoint to see if the server is working
        await testConnection(tickerToUse);
        
        throw new Error(`Server returned invalid JSON. Please check server logs.`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze ticker');
      }
      
      setRecommendation(data);
    } catch (err) {
      console.error('Error details:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingEarnings = async () => {
    setEarningsLoading(true);
    setEarningsError(null);
    
    // If API key section is not shown but user attempts to fetch, show it if likely needed
    if (!showApiKey && !apiKey) {
      setShowApiKey(true);
    }
    
    try {
      const url = new URL('http://localhost:5000/upcoming-earnings');
      url.searchParams.append('days', days);
      url.searchParams.append('count', companyCount);
      if (sector) url.searchParams.append('sector', sector);
      
      // Add API key to request headers if provided in UI
      const headers = {};
      if (apiKey) {
        headers['X-Perplexity-API-Key'] = apiKey;
      }
      
      const response = await fetch(url.toString(), {
        headers
      });
      
      let errorData;
      
      if (!response.ok) {
        try {
          // Try to parse as JSON for structured error messages
          errorData = await response.json();
          if (errorData && errorData.error) {
            // Check if it's an API key related error and auto-show the API key input
            if (errorData.error.toLowerCase().includes('api key') && !showApiKey) {
              setShowApiKey(true);
            }
            throw new Error(errorData.error);
          } else {
            throw new Error(`API Error (${response.status})`);
          }
        } catch (jsonError) {
          // If not JSON or no error field, fall back to text
          if (!(jsonError instanceof SyntaxError)) {
            throw jsonError;
          }
          const errorText = await response.text();
          throw new Error(`Failed to fetch upcoming earnings: ${errorText}`);
        }
      }
      
      const data = await response.json();
      
      if (data.companies) {
        setEarningsData(data.companies);
      } else if (Array.isArray(data)) {
        setEarningsData(data);
      } else {
        console.error('Unexpected data format:', data);
        setEarningsError('Received unexpected data format from server');
      }
    } catch (err) {
      console.error('Error fetching earnings:', err);
      setEarningsError(err.message);
    } finally {
      setEarningsLoading(false);
    }
  };
  
  // Sectors for dropdown
  const sectors = [
    'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical', 
    'Communication Services', 'Industrials', 'Consumer Defensive', 'Energy', 
    'Basic Materials', 'Real Estate', 'Utilities'
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white text-center mb-6">Options Strategy Analyzer</h1>
      
      <Tabs selectedIndex={activeTabIndex} onSelect={index => setActiveTabIndex(index)} selectedTabClassName="border-blue-500 text-blue-500 dark:text-blue-400">
        <TabList className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <Tab className="px-4 py-2 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer focus:outline-none transition-colors">
            <div className="flex items-center">
              <FaChartLine className="mr-2" /> Stock Analysis
            </div>
          </Tab>
          <Tab className="px-4 py-2 border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-500 dark:hover:border-blue-400 cursor-pointer focus:outline-none transition-colors">
            <div className="flex items-center">
              <FaCalendarAlt className="mr-2" /> Upcoming Earnings
            </div>
          </Tab>
        </TabList>

        <TabPanel>
          {/* Stock Analysis Panel */}
          <form onSubmit={handleSubmit} className="mb-6">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  placeholder="Enter Stock Symbol"
                  className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <FaSpinner className="animate-spin mr-2" /> Loading...
                  </div>
                ) : 'Analyze'}
              </button>
            </div>
          </form>

          {error && (
            <div className="p-4 mb-4 text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <p className="font-medium">Error:</p>
              <p>{error}</p>
              {error.includes('server') && (
                <p className="mt-2 text-sm">
                  Make sure the Flask server is running with: <br />
                  <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">python server.py</code>
                </p>
              )}
              {error.includes('No options') && (
                <p className="mt-2 text-sm">
                  This stock ({ticker.toUpperCase()}) may not have options available for trading.
                </p>
              )}
            </div>
          )}

          {loading && (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-300">Analyzing {ticker.toUpperCase()}...</p>
              <p className="text-xs text-gray-500 mt-1">This may take a few moments</p>
            </div>
          )}

          {recommendation && (
            <div className="flex flex-col space-y-6">
              {/* Top Section with Stock Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StockInfoCard 
                  info={recommendation.stockInfo} 
                  currentPrice={recommendation.currentPrice} 
                  analysis={recommendation.analysis}
                  raw={recommendation.raw}
                />
                <StockAnalysisCard 
                  analysis={recommendation.analysis} 
                />
              </div>
              
              {/* Charts Section */}
              {recommendation.chartData ? (
                <ChartSection 
                  chartData={{
                    termStructure: recommendation.chartData.termStructure || [],
                    optionData: recommendation.chartData.optionData || [],
                    priceHistory: recommendation.chartData.priceHistory || [],
                    volatility: (recommendation.chartData.volatility || []).map(v => ({
                      ...v,
                      iv: recommendation.raw?.iv30 || 0 // Add IV to each point for comparison
                    })),
                    iv30: recommendation.raw?.iv30 || 0,
                    rv30: recommendation.raw?.rv30 || 0
                  }}
                  ticker={recommendation.ticker}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="text-center py-8">
                    <FaChartLine className="mx-auto mb-4 text-gray-400" size={32} />
                    <p className="text-gray-700 dark:text-gray-300 text-lg">
                      Chart data is being processed...
                    </p>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      For a complete analysis with charts, please try again in a moment.
                    </p>
                    <button 
                      onClick={() => handleSubmit(null, ticker)}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Refresh Charts
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {!recommendation && !loading && !error && (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              <FaChartLine size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <p className="text-lg">Enter a stock symbol to analyze options strategy</p>
              <p className="mt-2 text-sm">Example tickers: AAPL, MSFT, TSLA, NVDA, AMZN</p>
            </div>
          )}
        </TabPanel>
        
        <TabPanel>
          {/* Upcoming Earnings Panel */}
          <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h2 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
              Find Upcoming Earnings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Days to Look Ahead
                </label>
                <select
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[3, 5, 7, 10, 14, 21, 30].map(d => (
                    <option key={d} value={d}>{d} days</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Number of Companies
                </label>
                <select
                  value={companyCount}
                  onChange={(e) => setCompanyCount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[5, 10, 15, 20, 25, 30].map(n => (
                    <option key={n} value={n}>{n} companies</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sector (Optional)
                </label>
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sectors</option>
                  {sectors.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={fetchUpcomingEarnings}
                  disabled={earningsLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                >
                  {earningsLoading ? (
                    <div className="flex items-center justify-center">
                      <FaSpinner className="animate-spin mr-2" /> Loading...
                    </div>
                  ) : 'Find Earnings'}
                </button>
              </div>
            </div>
            
            <div className="flex items-center mt-2 mb-1">
              <button 
                onClick={() => setShowApiKey(!showApiKey)} 
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center"
              >
                {showApiKey ? 'Hide API Key Settings' : 'Show API Key Settings'}
                <span className="ml-1">{showApiKey ? '▲' : '▼'}</span>
              </button>
            </div>
            
            {showApiKey && (
              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Perplexity API Key (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter Perplexity API Key"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => setApiKey('')}
                    className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                    title="Clear API Key"
                  >
                    Clear
                  </button>
                </div>
                <div className="mt-2 text-xs">
                  {apiKey ? (
                    <div className="text-green-600 dark:text-green-400 flex items-center">
                      <FaCheck className="mr-1" /> API Key set for this session
                    </div>
                  ) : (
                    <div className="text-gray-600 dark:text-gray-400">
                      Enter your API key here or set it in the .env file as PERPLEXITY_API_KEY. This browser-entered key takes precedence over the .env file.
                    </div>
                  )}
                  {earningsError && earningsError.includes("API key") && (
                    <div className="mt-1 text-red-600 dark:text-red-400 flex items-center">
                      <FaInfoCircle className="mr-1" /> {earningsError}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              <p>Uses Perplexity Sonar API to find upcoming earnings releases.</p>
            </div>
          </div>
          
          <UpcomingEarningsTable 
            earnings={earningsData} 
            loading={earningsLoading}
            error={earningsError}
          />
          
          {!earningsData.length && !earningsLoading && !earningsError && (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              <FaCalendarAlt size={48} className="mx-auto mb-4 text-gray-400 dark:text-gray-600" />
              <p className="text-lg">Click "Find Earnings" to get upcoming earnings releases</p>
            </div>
          )}
        </TabPanel>
      </Tabs>

      <div className="mt-6 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
        <p>DISCLAIMER: This tool is provided solely for educational and research purposes. 
        It is not intended to provide investment advice, and no investment recommendations are made herein.</p>
        <p className="mt-2">Strategy based on research by <a href="https://www.youtube.com/watch?v=oW6MHjzxHpU" className="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">Volatility Vibes (@VolatilityVibes)</a></p>
      </div>
    </div>
  );
};

export default Earnings;