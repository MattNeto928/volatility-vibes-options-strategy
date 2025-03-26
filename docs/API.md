# API Documentation

This document details the API endpoints available in the Options Spread Strategy application.

## Base URL

All API endpoints are relative to: `http://localhost:5000`

## Endpoints

### 1. Analyze Stock (Detailed)

Performs a comprehensive analysis of a stock ticker.

**Endpoint:** `GET /analyze/<ticker>`

**Parameters:**
- `ticker` (path parameter): Stock symbol to analyze

**Response:**
```json
{
  "ticker": "AAPL",
  "stockInfo": {
    "name": "Apple Inc.",
    "ticker": "AAPL",
    "sector": "Technology",
    "industry": "Consumer Electronics",
    "marketCap": 2750000000000,
    "peRatio": 28.4,
    "exchange": "NASDAQ",
    "ivPercentile": 65
  },
  "currentPrice": 172.5,
  "analysis": {
    "avg_volume": true,
    "avg_volume_value": 76500000,
    "iv30_rv30": true,
    "iv30_rv30_value": 1.35,
    "ts_slope_0_45": true,
    "ts_slope_0_45_value": -0.00612,
    "expected_move": "4.76%",
    "expected_move_value": 8.21
  },
  "raw": {
    "rv30": 0.21,
    "iv30": 0.28
  },
  "chartData": {
    "termStructure": [
      { "dte": 5, "iv": 0.29 },
      { "dte": 12, "iv": 0.28 },
      { "dte": 19, "iv": 0.27 },
      { "dte": 26, "iv": 0.26 },
      { "dte": 33, "iv": 0.25 },
      { "dte": 40, "iv": 0.24 }
    ],
    "optionData": [
      {
        "date": "2025-04-04",
        "daysToExpiry": 7,
        "callIV": 0.29,
        "putIV": 0.30,
        "atmIV": 0.295,
        "strike": 172.5
      }
    ],
    "priceHistory": [
      {
        "date": "2025-03-20",
        "open": 170.5,
        "high": 173.1,
        "low": 169.8,
        "close": 172.2,
        "volume": 65000000
      }
    ],
    "volatility": [
      { "window": 10, "rv": 0.18 },
      { "window": 20, "rv": 0.19 },
      { "window": 30, "rv": 0.21 },
      { "window": 60, "rv": 0.22 }
    ]
  }
}
```

### 2. Analyze Stock (Simplified)

A more efficient version of the analysis endpoint with slightly reduced data.

**Endpoint:** `GET /analyze-simple/<ticker>`

**Parameters:**
- `ticker` (path parameter): Stock symbol to analyze

**Response:**
Similar to the detailed endpoint but optimized for performance.

### 3. Upcoming Earnings

Retrieves a list of companies with upcoming earnings releases.

**Endpoint:** `GET /upcoming-earnings`

**Query Parameters:**
- `days` (optional): Number of days to look ahead (default: 7)
- `sector` (optional): Filter by specific sector
- `count` (optional): Maximum number of companies to return (default: 15)

**Response:**
```json
{
  "companies": [
    {
      "ticker": "MSFT",
      "company": "Microsoft Corporation",
      "date": "2025-04-25",
      "time": "AMC",
      "expectedEPS": 2.65
    },
    {
      "ticker": "AAPL",
      "company": "Apple Inc.",
      "date": "2025-04-30",
      "time": "AMC",
      "expectedEPS": 1.52
    }
  ]
}
```

### 4. Test Ticker

Tests the connection to the stock data API and validates if options data exists.

**Endpoint:** `GET /test/<ticker>`

**Parameters:**
- `ticker` (path parameter): Stock symbol to test

**Response:**
```json
{
  "ticker": "AAPL",
  "info": {
    "name": "Apple Inc.",
    "sector": "Technology",
    "price": 172.5
  },
  "options_available": true,
  "options_dates": ["2025-04-04", "2025-04-11", "2025-04-18"],
  "has_price_history": true
}
```

## Error Responses

All endpoints return appropriate HTTP status codes:

- `200 OK`: Request succeeded
- `400 Bad Request`: Invalid parameters
- `404 Not Found`: Ticker not found or no options data available
- `500 Internal Server Error`: Server-side processing error

Error responses include a JSON object with an error message:

```json
{
  "error": "Error message describing the problem"
}
```

## Rate Limiting

The API is subject to rate limiting by the underlying data providers (Yahoo Finance API and Perplexity Sonar API). Recommended usage:

- Limit requests to 1 per second for stock analysis endpoints
- Limit to 10 requests per minute for upcoming earnings endpoint