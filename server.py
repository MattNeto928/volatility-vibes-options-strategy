"""
DISCLAIMER: 

This software is provided solely for educational and research purposes. 
It is not intended to provide investment advice, and no investment recommendations are made herein. 
The developers are not financial advisors and accept no responsibility for any financial decisions or losses resulting from the use of this software. 
Always consult a professional financial advisor before making any investment decisions.
"""

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd
from scipy.interpolate import interp1d
import numpy as np
import time
import requests
import os
import json
import math
from dotenv import load_dotenv

# Custom JSON encoder to handle numpy types and NaN values
class NpEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        if isinstance(obj, np.floating):
            # Handle NaN, Infinity, etc.
            if np.isnan(obj) or np.isinf(obj):
                return None
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super(NpEncoder, self).default(obj)

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Perplexity Sonar API key
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

@app.route('/')
def home():
    return jsonify({"status": "Server is running"})

@app.route('/upcoming-earnings', methods=['GET'])
def get_upcoming_earnings():
    try:
        # Get query parameters
        days = request.args.get('days', '7')
        sector = request.args.get('sector', '')
        company_count = request.args.get('count', '15')
        
        # Validate days parameter
        try:
            days = int(days)
            if days < 1 or days > 30:
                days = 7  # Default to 7 days if out of range
        except ValueError:
            days = 7  # Default to 7 days if invalid
            
        # Validate company count parameter
        try:
            company_count = int(company_count)
            if company_count < 1 or company_count > 30:
                company_count = 15  # Default to 15 companies if out of range
        except ValueError:
            company_count = 15  # Default to 15 companies if invalid
        
        # Check for API key in request headers first (takes precedence)
        api_key = request.headers.get('X-Perplexity-API-Key')
        
        # Fall back to .env file if no key in headers
        if not api_key:
            api_key = PERPLEXITY_API_KEY
            
        # If no API key found in either place, return an error
        if not api_key:
            return jsonify({
                "error": "Perplexity API key not found. Please set PERPLEXITY_API_KEY in .env file or provide it in the API Key field under 'Show API Key Settings'."
            }), 400
            
        # Check if the API key looks valid (basic validation)
        if not api_key.startswith('pplx-'):
            return jsonify({
                "error": "Invalid Perplexity API key format. API keys should start with 'pplx-'."
            }), 400
            
        # Define the prompt for Sonar API
        sector_prompt = f" in the {sector} sector" if sector else ""
        system_prompt = """You are a financial data assistant that provides ONLY valid JSON without any commentary or explanation. 
        Format your entire response as a valid JSON array of company objects inside a code block with ```json tags.
        Do not include any text outside the JSON code block.
        Each object must have all of these fields: 
        - ticker (stock symbol as string)
        - company (full company name as string)
        - date (earnings date in YYYY-MM-DD format as string)
        - time (either "BMO" for before market open or "AMC" for after market close as string)
        - expectedEPS (expected earnings per share as a number)
        Double-check that your response is valid JSON that can be parsed."""
        
        user_prompt = f"List {company_count} companies with earnings releases in the next {days} days{sector_prompt}."
        
        # Use Perplexity's Sonar API
        try:
            url = "https://api.perplexity.ai/chat/completions"
            
            payload = {
                "model": "sonar",
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ],
                "max_tokens": 2048,  # Increased token limit to ensure complete response
                "temperature": 0.1,   # Lower temperature for more deterministic output
                "top_p": 0.95,
                "search_domain_filter": ["<any>"],
                "return_images": False,
                "return_related_questions": False,
                "web_search_options": {"search_context_size": "high"}
            }
            
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            }
            
            print(f"Sending request to Perplexity Sonar API")
            response = requests.post(url, json=payload, headers=headers)
            
        except Exception as e:
            print(f"Error using Perplexity Sonar API: {str(e)}")
            error_message = str(e)
            
            # Enhanced error messages for common API issues
            if "401" in error_message:
                return jsonify({"error": "API key authentication failed. Please check that your Perplexity API key is valid."}), 401
            elif "403" in error_message:
                return jsonify({"error": "API access forbidden. Your Perplexity API key may have insufficient permissions or has reached its limit."}), 403
            elif "429" in error_message:
                return jsonify({"error": "Too many requests. You've exceeded Perplexity API rate limits. Please try again later."}), 429
            else:
                return jsonify({"error": f"Error using Perplexity Sonar API: {error_message}"}), 500
        
        if response.status_code != 200:
            error_message = "Unknown error"
            try:
                error_data = response.json()
                if "error" in error_data:
                    error_message = error_data["error"].get("message", "Unknown error")
            except:
                error_message = response.text[:200] + "..." if len(response.text) > 200 else response.text
            
            # Handle specific HTTP error codes with user-friendly messages
            if response.status_code == 401:
                return jsonify({
                    "error": "Authentication failed. Your Perplexity API key is invalid or expired."
                }), 401
            elif response.status_code == 403:
                return jsonify({
                    "error": "Access denied. Your Perplexity API key doesn't have permission to use this feature."
                }), 403
            elif response.status_code == 429:
                return jsonify({
                    "error": "Rate limit exceeded. Please wait a moment before trying again."
                }), 429
            else:
                return jsonify({
                    "error": f"Perplexity API error (HTTP {response.status_code}): {error_message}"
                }), 500
            
        data = response.json()
        
        # Extract the content from the response
        try:
            # Perplexity API has slightly different response structure than OpenAI
            content = data["choices"][0]["message"]["content"]
            print(f"Content to parse: {content}")
            
            # Try to extract JSON from markdown code blocks if present
            import re
            json_matches = re.findall(r'```json\s*([\s\S]*?)\s*```', content)
            
            if json_matches:
                # Extract JSON from code block
                json_text = json_matches[0].strip()
                
                # Check if the JSON is incomplete (common when API response gets cut off)
                if not json_text.endswith(']'):
                    print("JSON appears to be incomplete, attempting to fix...")
                    if '},' in json_text and not json_text.endswith('},'):
                        # Try to find the last complete object and close the array
                        last_complete_obj_idx = json_text.rfind('},') + 2
                        if last_complete_obj_idx > 2:  # Found a complete object
                            json_text = json_text[:last_complete_obj_idx] + "]"
                    elif '}' in json_text and not json_text.endswith('}'):
                        # If no comma-separated objects found, try to find last complete object
                        last_complete_obj_idx = json_text.rfind('}') + 1
                        if last_complete_obj_idx > 1:  # Found a complete object
                            json_text = json_text[:last_complete_obj_idx] + "]"
                
                try:
                    earnings_data = json.loads(json_text)
                    print(f"Successfully extracted JSON from markdown code block in content")
                    
                    # Ensure proper date formatting
                    if isinstance(earnings_data, list):
                        for company in earnings_data:
                            if "date" in company:
                                # Use our standardize_date_format helper function
                                company["date"] = standardize_date_format(company["date"])
                        
                        # Wrap in companies key
                        earnings_data = {"companies": earnings_data}
                        return jsonify(earnings_data)
                except json.JSONDecodeError as je:
                    print(f"Error parsing JSON from markdown: {str(je)}")
                    
                    # Try to manually fix common JSON formatting issues
                    try:
                        # Replace single quotes with double quotes
                        fixed_json = json_text.replace("'", '"')
                        # Fix unquoted keys
                        fixed_json = re.sub(r'(\s*)(\w+)(\s*):([^/])', r'\1"\2"\3:\4', fixed_json)
                        earnings_data = json.loads(fixed_json)
                        print("Successfully parsed JSON after fixing formatting")
                        if isinstance(earnings_data, list):
                            # Apply the same date formatting fixes
                            for company in earnings_data:
                                if "date" in company:
                                    company["date"] = standardize_date_format(company["date"])
                            
                            earnings_data = {"companies": earnings_data}
                            return jsonify(earnings_data)
                    except json.JSONDecodeError:
                        print("Failed to parse even after fixing formatting")
            
            # If no code block or parsing failed, try parsing the full content
            try:
                earnings_data = json.loads(content)
                
                # Ensure we have the expected structure
                if "companies" not in earnings_data and isinstance(earnings_data, dict):
                    # Try to find an array in the response
                    for key, value in earnings_data.items():
                        if isinstance(value, list):
                            earnings_data = {"companies": value}
                            break
                    else:
                        # If no list is found, wrap the entire object
                        earnings_data = {"companies": [earnings_data]}
                
                # Process dates in the companies list
                if "companies" in earnings_data and isinstance(earnings_data["companies"], list):
                    for company in earnings_data["companies"]:
                        if "date" in company:
                            company["date"] = standardize_date_format(company["date"])
                
                return jsonify(earnings_data)
            except json.JSONDecodeError as je:
                print(f"Failed to parse content as JSON: {str(je)}")
                
                # Try to extract the data using AI pattern matching
                try:
                    # Extract any text that looks like a ticker symbol paired with a company name and date
                    companies = []
                    # Look for patterns like "ticker": "AAPL" or similar
                    ticker_matches = re.findall(r'["\']{0,1}ticker["\']{0,1}\s*:\s*["\']{0,1}([A-Z]+)["\']{0,1}', content)
                    company_matches = re.findall(r'["\']{0,1}company["\']{0,1}\s*:\s*["\']{0,1}([^"\']+)["\']{0,1}', content)
                    date_matches = re.findall(r'["\']{0,1}date["\']{0,1}\s*:\s*["\']{0,1}(\d{4}-\d{2}-\d{2})["\']{0,1}', content)
                    time_matches = re.findall(r'["\']{0,1}time["\']{0,1}\s*:\s*["\']{0,1}(BMO|AMC)["\']{0,1}', content)
                    eps_matches = re.findall(r'["\']{0,1}expectedEPS["\']{0,1}\s*:\s*([-+]?\d*\.\d+|\d+)', content)
                    
                    # If we have ticker symbols, we can try to construct company objects
                    if ticker_matches:
                        max_len = min(len(ticker_matches), 
                                    len(company_matches) if company_matches else 9999,
                                    len(date_matches) if date_matches else 9999,
                                    len(time_matches) if time_matches else 9999,
                                    len(eps_matches) if eps_matches else 9999)
                        
                        for i in range(min(max_len, 15)):  # Limit to 15 companies max
                            company_obj = {"ticker": ticker_matches[i]}
                            if company_matches and i < len(company_matches):
                                company_obj["company"] = company_matches[i]
                            if date_matches and i < len(date_matches):
                                company_obj["date"] = date_matches[i]
                            if time_matches and i < len(time_matches):
                                company_obj["time"] = time_matches[i]
                            if eps_matches and i < len(eps_matches):
                                try:
                                    company_obj["expectedEPS"] = float(eps_matches[i])
                                except:
                                    company_obj["expectedEPS"] = None
                            
                            companies.append(company_obj)
                        
                        if companies:
                            # Standardize date formats in extracted companies
                            for company in companies:
                                if "date" in company:
                                    company["date"] = standardize_date_format(company["date"])
                                                
                            print(f"Successfully extracted {len(companies)} companies using pattern matching")
                            return jsonify({"companies": companies})
                except Exception as ex:
                    print(f"Error during pattern extraction: {str(ex)}")
                
                # If all pattern matching fails, fall back to manual array extraction
                array_matches = re.findall(r'\[\s*\{.*?\}\s*\]', content, re.DOTALL)
                if array_matches:
                    try:
                        cleaned_json = array_matches[0].replace("'", '"')  # Replace single quotes with double quotes
                        earnings_data = json.loads(cleaned_json)
                        return jsonify({"companies": earnings_data})
                    except json.JSONDecodeError:
                        pass
                        
                return jsonify({
                    "error": f"Failed to parse Perplexity response: {str(je)}",
                    "raw_response": content
                }), 500
        except (KeyError, Exception) as e:
            print(f"Error during response parsing: {str(e)}")
            
            # If we have access to the response content, try a last-ditch effort with pattern matching
            if 'content' in locals():
                try:
                    # Make one final attempt at pattern matching
                    companies = []
                    ticker_matches = re.findall(r'["\']*ticker["\']*\s*:\s*["\']*([A-Z]+)["\']*', content)
                    
                    if ticker_matches:
                        # Extract company names that might be near the tickers
                        company_chunks = re.split(r'["\']*ticker["\']*\s*:', content)
                        company_names = []
                        
                        for i, chunk in enumerate(company_chunks[1:], 1):  # Skip the first split which is before any ticker
                            # Find a potential company name in the previous chunk
                            company_match = re.search(r'["\']*company["\']*\s*:\s*["\']*([^"\']+)["\']*', 
                                                company_chunks[i-1] if i > 0 else "")
                            if company_match:
                                company_names.append(company_match.group(1).strip())
                            else:
                                # If no explicit company field, try to find any name-like text
                                name_match = re.search(r'([A-Z][a-zA-Z\s\.&,]+(?:Inc|Corp|Co|Ltd)\.?)', 
                                                    company_chunks[i-1] if i > 0 else "")
                                if name_match:
                                    company_names.append(name_match.group(1).strip())
                                else:
                                    company_names.append(f"Unknown Company ({ticker_matches[i-1]})")
                        
                        # Create company objects
                        for i, ticker in enumerate(ticker_matches):
                            company_obj = {"ticker": ticker}
                            if i < len(company_names):
                                company_obj["company"] = company_names[i]
                            
                            # Try to find a date near this ticker
                            date_search = re.search(r'(\d{4}-\d{2}-\d{2})', 
                                                company_chunks[i+1] if i+1 < len(company_chunks) else "")
                            if date_search:
                                company_obj["date"] = date_search.group(1)
                            
                            # Look for BMO or AMC
                            if 'BMO' in company_chunks[i+1] if i+1 < len(company_chunks) else "":
                                company_obj["time"] = "BMO"
                            elif 'AMC' in company_chunks[i+1] if i+1 < len(company_chunks) else "":
                                company_obj["time"] = "AMC"
                            
                            companies.append(company_obj)
                        
                        if companies:
                            # Process and standardize dates
                            for company in companies:
                                if "date" in company:
                                    company["date"] = standardize_date_format(company["date"])
                            
                            print(f"Emergency extraction succeeded with {len(companies)} companies")
                            return jsonify({"companies": companies})
                except Exception as ex:
                    print(f"Emergency extraction failed: {str(ex)}")
            
            return jsonify({
                "error": f"Failed to parse Perplexity response: {str(e)}",
                "raw_response": content if 'content' in locals() else "No content found"
            }), 500
            
    except Exception as e:
        import traceback
        print(f"Error in upcoming earnings endpoint: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# Simple endpoint for testing
@app.route('/test/<ticker>')
def test_ticker(ticker):
    try:
        ticker = ticker.strip().upper()
        if not ticker:
            return jsonify({"error": "No ticker provided"}), 400
            
        # Add a simple delay to avoid rate limiting
        time.sleep(1)
        
        stock = yf.Ticker(ticker)
        
        # Get basic info to test the connection
        info = {}
        try:
            if hasattr(stock, 'info') and stock.info:
                info = {
                    'name': stock.info.get('shortName', 'N/A'),
                    'sector': stock.info.get('sector', 'N/A'),
                    'price': stock.info.get('currentPrice', 'N/A')
                }
        except Exception as e:
            info = {'error': f"Error getting info: {str(e)}"}
        
        # Test options data availability
        options_available = False
        options_dates = []
        try:
            if hasattr(stock, 'options'):
                options_dates = list(stock.options)
                options_available = len(options_dates) > 0
        except Exception as e:
            options_dates = [f"Error: {str(e)}"]
            
        # Get recent price history
        has_price_history = False
        try:
            hist = stock.history(period='5d')
            has_price_history = not hist.empty
        except Exception as e:
            has_price_history = False
        
        return jsonify({
            'ticker': ticker,
            'info': info,
            'options_available': options_available,
            'options_dates': options_dates[:5] if len(options_dates) > 5 else options_dates,  # Limit to 5 dates
            'has_price_history': has_price_history
        })
        
    except Exception as e:
        import traceback
        print(f"Error in test endpoint: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

def filter_dates(dates):
    today = datetime.today().date()
    cutoff_date = today + timedelta(days=45)
    
    sorted_dates = sorted(datetime.strptime(date, "%Y-%m-%d").date() for date in dates)

    arr = []
    for i, date in enumerate(sorted_dates):
        if date >= cutoff_date:
            arr = [d.strftime("%Y-%m-%d") for d in sorted_dates[:i+1]]  
            break
    
    if len(arr) > 0:
        if arr[0] == today.strftime("%Y-%m-%d"):
            return arr[1:]
        return arr

    raise ValueError("No date 45 days or more in the future found.")

def standardize_date_format(date_str, adjust_day=False):  # Changed default to False to match calculator.py behavior
    """
    Parse and standardize date string to YYYY-MM-DD format.
    Optionally add one day to compensate for React display issues.
    Returns original string if parsing fails.
    """
    try:
        # First, try to parse as YYYY-MM-DD
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        try:
            # Try MM/DD/YYYY format
            date_obj = datetime.strptime(date_str, "%m/%d/%Y").date()
        except ValueError:
            try:
                # Try MM-DD-YYYY format
                date_obj = datetime.strptime(date_str, "%m-%d-%Y").date()
            except ValueError:
                # Return original if all parsing fails
                print(f"Warning: Could not parse date: {date_str}")
                return date_str
    
    # Add one day to compensate for React display issue if requested
    if adjust_day:
        date_obj = date_obj + timedelta(days=1)
    
    # Return standardized format
    return date_obj.strftime("%Y-%m-%d")


def yang_zhang(price_data, window=30, trading_periods=252, return_last_only=True):
    log_ho = (price_data['High'] / price_data['Open']).apply(np.log)
    log_lo = (price_data['Low'] / price_data['Open']).apply(np.log)
    log_co = (price_data['Close'] / price_data['Open']).apply(np.log)
    
    log_oc = (price_data['Open'] / price_data['Close'].shift(1)).apply(np.log)
    log_oc_sq = log_oc**2
    
    log_cc = (price_data['Close'] / price_data['Close'].shift(1)).apply(np.log)
    log_cc_sq = log_cc**2
    
    rs = log_ho * (log_ho - log_co) + log_lo * (log_lo - log_co)
    
    close_vol = log_cc_sq.rolling(
        window=window,
        center=False
    ).sum() * (1.0 / (window - 1.0))

    open_vol = log_oc_sq.rolling(
        window=window,
        center=False
    ).sum() * (1.0 / (window - 1.0))

    window_rs = rs.rolling(
        window=window,
        center=False
    ).sum() * (1.0 / (window - 1.0))

    k = 0.34 / (1.34 + ((window + 1) / (window - 1)) )
    result = (open_vol + k * close_vol + (1 - k) * window_rs).apply(np.sqrt) * np.sqrt(trading_periods)

    if return_last_only:
        return result.iloc[-1]
    else:
        return result.dropna()
    

def build_term_structure(days, ivs):
    days = np.array(days)
    ivs = np.array(ivs)

    sort_idx = days.argsort()
    days = days[sort_idx]
    ivs = ivs[sort_idx]

    spline = interp1d(days, ivs, kind='linear', fill_value="extrapolate")

    def term_spline(dte):
        if dte < days[0]:  
            return ivs[0]
        elif dte > days[-1]:
            return ivs[-1]
        else:  
            return float(spline(dte))

    return term_spline

def get_current_price(ticker):
    todays_data = ticker.history(period='1d')
    if todays_data.empty:
        return None
    # Use the same indexing method as calculator.py for consistency
    return todays_data['Close'][0]

@app.route('/analyze-simple/<ticker>', methods=['GET'])
def analyze_ticker_simple(ticker):
    """Simplified version of the analyzer with minimal data for better client compatibility"""
    try:
        ticker = ticker.strip().upper()
        if not ticker:
            return jsonify({"error": "No stock symbol provided."}), 400
        
        # Add a delay to avoid rate limiting
        time.sleep(1)
        
        try:
            print(f"Fetching simple data for {ticker}...")
            stock = yf.Ticker(ticker)
            
            # Get basic stock info
            stock_info = {}
            try:
                if hasattr(stock, 'info') and stock.info:
                    stock_info = {
                        'name': stock.info.get('shortName', ticker),
                        'ticker': ticker,
                        'sector': stock.info.get('sector', 'N/A'),
                        'industry': stock.info.get('industry', 'N/A'),
                        'marketCap': stock.info.get('marketCap', 'N/A'),
                        'peRatio': stock.info.get('trailingPE', 'N/A'),
                        # Additional data for enhanced stock info card
                        'exchange': stock.info.get('exchange', 'N/A'),
                        'avgVolume': stock.info.get('averageVolume', 'N/A'),
                        'previousClose': stock.info.get('previousClose', None),
                        'beta': stock.info.get('beta', 'N/A'),
                        'high52Week': stock.info.get('fiftyTwoWeekHigh', 'N/A'),
                        'low52Week': stock.info.get('fiftyTwoWeekLow', 'N/A'),
                        'dailyChange': stock.info.get('regularMarketChange', 0),
                        'dailyChangePercent': stock.info.get('regularMarketChangePercent', 0)
                    }
                    
                    # Get next earnings date if available
                    next_earnings = None
                    try:
                        calendar = stock.calendar
                        if calendar is not None and not calendar.empty:
                            if 'Earnings Date' in calendar.index:
                                earnings_date = calendar.loc['Earnings Date'][0]
                                if isinstance(earnings_date, (datetime, pd.Timestamp)):
                                    next_earnings = earnings_date.strftime('%Y-%m-%d')
                    except Exception as e:
                        print(f"Error getting earnings date: {str(e)}")
                    
                    if next_earnings:
                        stock_info['nextEarningsDate'] = next_earnings
            except Exception as e:
                print(f"Error getting stock info: {str(e)}")
                stock_info = {'name': ticker}
            
            # Check if options are available
            if not hasattr(stock, 'options') or not stock.options:
                return jsonify({"error": f"No options found for stock symbol '{ticker}'"}), 404
            
            # Get current price - using the same method as calculator.py
            try:
                current_price = get_current_price(stock)
                if current_price is None:
                    return jsonify({"error": "No market price found."}), 500
            except Exception as e:
                return jsonify({"error": f"Unable to retrieve underlying stock price: {str(e)}"}), 500
            
            # Calculate everything exactly as in calculator.py
            try:
                # First, filter the option dates
                try:
                    exp_dates = filter_dates(list(stock.options))
                except Exception as e:
                    return jsonify({"error": f"Error filtering expiration dates: {str(e)}"}), 400
                
                # Get option chains exactly as in calculator.py
                options_chains = {}
                for exp_date in exp_dates:
                    options_chains[exp_date] = stock.option_chain(exp_date)
                
                # Calculate ATM IV and straddle exactly as in calculator.py
                atm_iv = {}
                straddle = None 
                i = 0
                for exp_date, chain in options_chains.items():
                    calls = chain.calls
                    puts = chain.puts

                    if calls.empty or puts.empty:
                        continue

                    call_diffs = (calls['strike'] - current_price).abs()
                    call_idx = call_diffs.idxmin()
                    call_iv = calls.loc[call_idx, 'impliedVolatility']

                    put_diffs = (puts['strike'] - current_price).abs()
                    put_idx = put_diffs.idxmin()
                    put_iv = puts.loc[put_idx, 'impliedVolatility']

                    atm_iv_value = (call_iv + put_iv) / 2.0
                    atm_iv[exp_date] = atm_iv_value

                    if i == 0:
                        call_bid = calls.loc[call_idx, 'bid']
                        call_ask = calls.loc[call_idx, 'ask']
                        put_bid = puts.loc[put_idx, 'bid']
                        put_ask = puts.loc[put_idx, 'ask']
                        
                        if call_bid is not None and call_ask is not None:
                            call_mid = (call_bid + call_ask) / 2.0
                        else:
                            call_mid = None

                        if put_bid is not None and put_ask is not None:
                            put_mid = (put_bid + put_ask) / 2.0
                        else:
                            put_mid = None

                        if call_mid is not None and put_mid is not None:
                            straddle = (call_mid + put_mid)

                    i += 1
                
                if not atm_iv:
                    return jsonify({"error": "Could not determine ATM IV for any expiration dates."}), 400
                
                # Build term structure exactly as in calculator.py
                today = datetime.today().date()
                dtes = []
                ivs = []
                for exp_date, iv in atm_iv.items():
                    exp_date_obj = datetime.strptime(exp_date, "%Y-%m-%d").date()
                    days_to_expiry = (exp_date_obj - today).days
                    dtes.append(days_to_expiry)
                    ivs.append(iv)
                
                term_spline = build_term_structure(dtes, ivs)
                ts_slope_0_45 = (term_spline(45) - term_spline(dtes[0])) / (45-dtes[0])
                
                # Get historical price data
                price_history = stock.history(period='3mo')
                
                # Calculate IV30/RV30 exactly as in calculator.py
                rv30 = yang_zhang(price_history)
                iv30 = term_spline(30)
                iv30_rv30 = iv30 / rv30
                
                # Calculate average volume exactly as in calculator.py
                avg_volume = price_history['Volume'].rolling(30).mean().dropna().iloc[-1]
                
                # Calculate expected move exactly as in calculator.py
                expected_move = str(round(straddle / current_price * 100, 2)) + "%" if straddle else None
                expected_move_value = round(straddle, 2) if straddle else None
                
                # Determine pass/fail criteria exactly as in calculator.py
                avg_volume_pass = bool(avg_volume >= 1500000)
                iv30_rv30_pass = bool(iv30_rv30 >= 1.25)
                ts_slope_pass = bool(ts_slope_0_45 <= -0.00406)
                
                # Added debugging to track calculation steps
                print(f"\n============= DETAILED ANALYSIS FOR {ticker} (Simple Endpoint) ===============")
                print(f"ATM IV dates: {atm_iv.keys()}")
                print(f"DTEs: {dtes}")
                print(f"IVs: {ivs}")
                print(f"Current price: {current_price}")
                print(f"Average volume: {avg_volume} (passes: {avg_volume_pass})")
                print(f"IV30: {iv30}")
                print(f"RV30: {rv30}")
                print(f"IV30/RV30: {iv30_rv30} (passes: {iv30_rv30_pass})")
                print(f"Term structure slope: {ts_slope_0_45} (passes: {ts_slope_pass})")
                if straddle:
                    print(f"Straddle: {straddle}")
                    print(f"Expected move: {expected_move}")
                else:
                    print("Straddle: None")
                print("==================================================================\n")
                
                # Add price history data for the chart
                price_history_data = []
                for date, row in price_history.iterrows():
                    price_history_data.append({
                        'date': date.strftime('%Y-%m-%d'),
                        'open': float(row['Open']),
                        'high': float(row['High']),
                        'low': float(row['Low']),
                        'close': float(row['Close']),
                        'volume': float(row['Volume'])
                    })
                
                # Build result object - EXACTLY matching calculator.py output format
                # Calculate IV percentile (simple estimate)
                iv_percentile = int(round(iv30 * 100))
                
                # Add IV percentile to stock info
                stock_info['ivPercentile'] = iv_percentile
                
                result = {
                    'ticker': ticker,
                    'stockInfo': stock_info,
                    'currentPrice': float(current_price),
                    'analysis': {
                        'avg_volume': avg_volume_pass,  # Boolean value as in calculator.py
                        'avg_volume_value': float(avg_volume),
                        'iv30_rv30': iv30_rv30_pass,  # Boolean value as in calculator.py
                        'iv30_rv30_value': float(iv30_rv30),
                        'ts_slope_0_45': ts_slope_pass,  # Boolean value as in calculator.py
                        'ts_slope_0_45_value': float(ts_slope_0_45),
                        'expected_move': expected_move,
                        'expected_move_value': expected_move_value if expected_move_value is not None else None
                    },
                    'raw': {
                        'rv30': float(rv30),
                        'iv30': float(iv30)
                    },
                    'chartData': {
                        'termStructure': [
                            {'dte': dte, 'iv': float(term_spline(dte))}
                            for dte in range(min(dtes), max(45, max(dtes)) + 1, 1)
                        ],
                        'optionData': [
                            {
                                'date': exp_date,
                                'daysToExpiry': (datetime.strptime(exp_date, "%Y-%m-%d").date() - today).days,
                                'strike': float(current_price),
                                'callIV': float(atm_iv[exp_date]),
                                'putIV': float(atm_iv[exp_date]),
                                'atmIV': float(atm_iv[exp_date])
                            }
                            for exp_date in list(atm_iv.keys())[:5]  # Limit to 5 expiration dates
                        ],
                        'priceHistory': price_history_data[-30:] if price_history_data else [],
                        'volatility': [
                            {'window': window, 'rv': float(yang_zhang(price_history, window=window))}
                            for window in [10, 20, 30, 60] if len(price_history) >= window
                        ]
                    }
                }
                
                # Ensure all data is properly serializable before returning
                def ensure_serializable(obj):
                    if isinstance(obj, (np.integer, np.floating, np.bool_)):
                        # Handle NaN and infinity
                        if isinstance(obj, np.floating) and (np.isnan(obj) or np.isinf(obj)):
                            return None
                        return obj.item()  # Convert numpy types to Python native types
                    if isinstance(obj, (list, tuple)):
                        return [ensure_serializable(item) for item in obj]
                    if isinstance(obj, dict):
                        return {key: ensure_serializable(value) for key, value in obj.items()}
                    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                        return None
                    return obj
                
                result = ensure_serializable(result)
                
                try:
                    # Directly use Flask's jsonify which handles serialization better
                    return jsonify(result)
                except Exception as json_error:
                    print(f"JSON serialization error in simple endpoint: {str(json_error)}")
                    # Try alternative serialization approach
                    try:
                        # Convert the result manually using the custom encoder
                        sanitized_result = json.loads(json.dumps(result, cls=NpEncoder))
                        return jsonify(sanitized_result)
                    except Exception as second_error:
                        print(f"Second serialization attempt failed: {str(second_error)}")
                        # Return a simplified response as last resort
                        return jsonify({
                            "ticker": ticker,
                            "error": "Data serialization issue, check server logs",
                            "message": str(json_error)
                        }), 500
            except Exception as e:
                import traceback
                print(f"Error calculating simplified metrics: {str(e)}")
                print(traceback.format_exc())
                return jsonify({"error": f"Error in calculations: {str(e)}"}), 500
                
        except Exception as e:
            return jsonify({"error": f"Error fetching ticker data: {str(e)}"}), 500
            
    except Exception as e:
        import traceback
        print("===================== ERROR =====================")
        print(traceback.format_exc())
        print("================================================")
        return jsonify({"error": str(e)}), 500

@app.route('/analyze/<ticker>', methods=['GET'])
def analyze_ticker(ticker):
    try:
        ticker = ticker.strip().upper()
        if not ticker:
            return jsonify({"error": "No stock symbol provided."}), 400
        
        # Add a delay to avoid rate limiting
        time.sleep(1)
        
        try:
            print(f"Fetching data for {ticker}...")
            stock = yf.Ticker(ticker)
            
            # Get basic stock info
            stock_info = {}
            try:
                if hasattr(stock, 'info') and stock.info:
                    stock_info = {
                        'name': stock.info.get('shortName', ticker),
                        'ticker': ticker,
                        'sector': stock.info.get('sector', 'N/A'),
                        'industry': stock.info.get('industry', 'N/A'),
                        'marketCap': stock.info.get('marketCap', 'N/A'),
                        'peRatio': stock.info.get('trailingPE', 'N/A'),
                        'website': stock.info.get('website', 'N/A'),
                        # Additional data for enhanced stock info card
                        'exchange': stock.info.get('exchange', 'N/A'),
                        'avgVolume': stock.info.get('averageVolume', 'N/A'),
                        'previousClose': stock.info.get('previousClose', None),
                        'beta': stock.info.get('beta', 'N/A'),
                        'high52Week': stock.info.get('fiftyTwoWeekHigh', 'N/A'),
                        'low52Week': stock.info.get('fiftyTwoWeekLow', 'N/A'),
                        'dailyChange': stock.info.get('regularMarketChange', 0),
                        'dailyChangePercent': stock.info.get('regularMarketChangePercent', 0)
                    }
                    
                    # Get next earnings date if available
                    next_earnings = None
                    try:
                        calendar = stock.calendar
                        if calendar is not None and not calendar.empty:
                            if 'Earnings Date' in calendar.index:
                                earnings_date = calendar.loc['Earnings Date'][0]
                                if isinstance(earnings_date, (datetime, pd.Timestamp)):
                                    next_earnings = earnings_date.strftime('%Y-%m-%d')
                    except Exception as e:
                        print(f"Error getting earnings date: {str(e)}")
                    
                    if next_earnings:
                        stock_info['nextEarningsDate'] = next_earnings
            except Exception as e:
                print(f"Error getting stock info: {str(e)}")
                stock_info = {'name': ticker}
            
            # Check if we can access options property
            if not hasattr(stock, 'options'):
                return jsonify({"error": f"No options attribute found for '{ticker}'"}), 404
            
            # Try accessing the options list
            try:
                options_list = list(stock.options)
                if not options_list:
                    return jsonify({"error": f"No options expiration dates found for '{ticker}'"}), 404
                print(f"Found {len(options_list)} option expiration dates")
            except Exception as e:
                return jsonify({"error": f"Error accessing options list: {str(e)}"}), 500
                
        except Exception as e:
            return jsonify({"error": f"Error fetching ticker data: {str(e)}"}), 500
        
        # Filter dates exactly as calculator.py does
        try:
            exp_dates = filter_dates(stock.options)
            print(f"Filtered to {len(exp_dates)} dates")
        except Exception as e:
            return jsonify({"error": f"Error filtering dates: {str(e)}"}), 400
        
        # Get option chains exactly as calculator.py does
        options_chains = {}
        for exp_date in exp_dates:
            try:
                # Add delay to avoid rate limiting
                time.sleep(0.5)
                options_chains[exp_date] = stock.option_chain(exp_date)
            except Exception as e:
                print(f"Error fetching options chain for {exp_date}: {str(e)}")
                continue
        
        if not options_chains:
            return jsonify({"error": "Could not retrieve valid option chains."}), 500
        
        # Get current price using the same method as calculator.py
        try:
            underlying_price = get_current_price(stock)
            if underlying_price is None:
                return jsonify({"error": "No market price found."}), 500
            print(f"Current price: {underlying_price}")
        except Exception as e:
            return jsonify({"error": f"Unable to retrieve underlying stock price: {str(e)}"}), 500
        
        # Calculate ATM IV and straddle exactly as calculator.py does
        atm_iv = {}
        straddle = None 
        i = 0
        
        # Store option chain data for visualization
        option_data = []
        
        for exp_date, chain in options_chains.items():
            calls = chain.calls
            puts = chain.puts

            if calls.empty or puts.empty:
                continue

            try:
                # Ensure required columns exist
                required_columns = ['strike', 'impliedVolatility', 'bid', 'ask']
                if not all(col in calls.columns for col in required_columns) or \
                   not all(col in puts.columns for col in required_columns):
                    print(f"Missing required columns for {exp_date}")
                    continue
                
                call_diffs = (calls['strike'] - underlying_price).abs()
                call_idx = call_diffs.idxmin()
                call_iv = calls.loc[call_idx, 'impliedVolatility']

                put_diffs = (puts['strike'] - underlying_price).abs()
                put_idx = put_diffs.idxmin()
                put_iv = puts.loc[put_idx, 'impliedVolatility']

                # Check for valid IV values
                if np.isnan(call_iv) or np.isnan(put_iv):
                    print(f"Invalid IV values for {exp_date}")
                    continue

                atm_iv_value = (call_iv + put_iv) / 2.0
                atm_iv[exp_date] = atm_iv_value
                
                # Store ATM option data for this expiration date
                exp_date_obj = datetime.strptime(exp_date, "%Y-%m-%d").date()
                days_to_expiry = (exp_date_obj - datetime.today().date()).days
                
                option_data.append({
                    'date': exp_date,
                    'daysToExpiry': days_to_expiry,
                    'callIV': float(call_iv),
                    'putIV': float(put_iv),
                    'atmIV': float(atm_iv_value),
                    'strike': float(calls.loc[call_idx, 'strike'])
                })

                # Use exactly the same logic as calculator.py for straddle calculation
                if i == 0:
                    call_bid = calls.loc[call_idx, 'bid']
                    call_ask = calls.loc[call_idx, 'ask']
                    put_bid = puts.loc[put_idx, 'bid']
                    put_ask = puts.loc[put_idx, 'ask']
                    
                    # Use the same None check as calculator.py
                    if call_bid is not None and call_ask is not None:
                        call_mid = (call_bid + call_ask) / 2.0
                    else:
                        call_mid = None

                    if put_bid is not None and put_ask is not None:
                        put_mid = (put_bid + put_ask) / 2.0
                    else:
                        put_mid = None

                    if call_mid is not None and put_mid is not None:
                        straddle = (call_mid + put_mid)
            except Exception as e:
                print(f"Error processing chain for {exp_date}: {str(e)}")
                continue

            i += 1
        
        if not atm_iv:
            return jsonify({"error": "Could not determine ATM IV for any expiration dates."}), 400
        
        # Calculate term structure exactly as calculator.py does
        today = datetime.today().date()
        dtes = []
        ivs = []
        for exp_date, iv in atm_iv.items():
            exp_date_obj = datetime.strptime(exp_date, "%Y-%m-%d").date()
            days_to_expiry = (exp_date_obj - today).days
            dtes.append(days_to_expiry)
            ivs.append(iv)
        
        try:
            # Need at least 2 points for interpolation
            if len(dtes) < 2:
                return jsonify({"error": "Not enough valid expiration dates for term structure analysis."}), 400
                
            term_spline = build_term_structure(dtes, ivs)
            ts_slope_0_45 = (term_spline(45) - term_spline(dtes[0])) / (45-dtes[0])
            
            # Calculate additional points for the term structure curve
            curve_points = []
            for dte in range(min(dtes), max(45, max(dtes)) + 1, 1):
                curve_points.append({
                    'dte': dte,
                    'iv': float(term_spline(dte))
                })
        except Exception as e:
            return jsonify({"error": f"Error building term structure: {str(e)}"}), 500
        
        try:
            # Get price history with delay to avoid rate limiting
            time.sleep(0.5)
            price_history = stock.history(period='3mo')
            if price_history.empty:
                return jsonify({"error": "No price history available."}), 500
            
            # Prepare historical price data for charting
            price_history_data = []
            for date, row in price_history.iterrows():
                price_history_data.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'open': float(row['Open']),
                    'high': float(row['High']),
                    'low': float(row['Low']),
                    'close': float(row['Close']),
                    'volume': float(row['Volume'])
                })
                
            # Check if we have enough history for calculations
            if len(price_history) < 30:
                return jsonify({"error": "Not enough price history for volatility calculations."}), 400
                
            # Calculate IV30/RV30 exactly as calculator.py does
            rv30 = yang_zhang(price_history)
            iv30 = term_spline(30)
            iv30_rv30 = iv30 / rv30

            # Calculate average volume exactly as calculator.py does
            avg_volume = price_history['Volume'].rolling(30).mean().dropna().iloc[-1]
            
            # Calculate historical volatility curve
            volatility_data = []
            for window in [10, 20, 30, 60, 90]:
                if len(price_history) >= window:
                    try:
                        rv = yang_zhang(price_history, window=window)
                        volatility_data.append({
                            'window': window,
                            'rv': float(rv)
                        })
                    except:
                        pass
            
            # Check for valid values
            if np.isnan(rv30) or np.isnan(iv30) or np.isnan(avg_volume):
                return jsonify({"error": "Invalid calculation results (NaN values)."}), 500
                
        except Exception as e:
            return jsonify({"error": f"Error calculating volatility metrics: {str(e)}"}), 500

        # Calculate expected move exactly as in calculator.py
        expected_move = str(round(straddle / underlying_price * 100, 2)) + "%" if straddle else None
        expected_move_value = round(straddle, 2) if straddle else None

        # Apply criteria checks exactly as calculator.py does
        avg_volume_pass = bool(avg_volume >= 1500000)
        iv30_rv30_pass = bool(iv30_rv30 >= 1.25)
        ts_slope_pass = bool(ts_slope_0_45 <= -0.00406)
        
        # Extensive debugging of calculation steps and values
        print(f"\n================= DETAILED ANALYSIS FOR {ticker} (Full Endpoint) =================")
        print("Step 1: Average Volume Check")
        print(f"   avg_volume = {avg_volume}")
        print(f"   threshold = 1500000")
        print(f"   avg_volume_pass = {avg_volume_pass}")
        
        print("\nStep 2: IV30/RV30 Ratio Check")
        print(f"   iv30 = {iv30}")
        print(f"   rv30 = {rv30}")
        print(f"   iv30_rv30 = {iv30_rv30}")
        print(f"   threshold = 1.25")
        print(f"   iv30_rv30_pass = {iv30_rv30_pass}")
        
        print("\nStep 3: Term Structure Slope Check")
        print(f"   term_spline(45) = {term_spline(45)}")
        print(f"   term_spline(dtes[0]) = {term_spline(dtes[0])}")
        print(f"   45 - dtes[0] = {45 - dtes[0]}")
        print(f"   ts_slope_0_45 = {ts_slope_0_45}")
        print(f"   threshold = -0.00406")
        print(f"   ts_slope_pass = {ts_slope_pass}")
        
        print("\nStep 4: Expected Move Calculation")
        print(f"   straddle = {straddle}")
        print(f"   underlying_price = {underlying_price}")
        if straddle:
            print(f"   expected_move_pct = {round(straddle / underlying_price * 100, 2)}%")
        print(f"   expected_move = {expected_move}")
        
        # Ensure all data is JSON serializable
        def ensure_serializable(obj):
            if isinstance(obj, (np.integer, np.floating, np.bool_)):
                # Handle NaN and infinity
                if isinstance(obj, np.floating) and (np.isnan(obj) or np.isinf(obj)):
                    return None
                return obj.item()  # Convert numpy types to Python native types
            if isinstance(obj, (list, tuple)):
                return [ensure_serializable(item) for item in obj]
            if isinstance(obj, dict):
                return {key: ensure_serializable(value) for key, value in obj.items()}
            if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            return obj
            
        # Limit the size of the data to prevent JSON parsing issues
        # Reduce price history to fewer points
        limited_price_history = price_history_data[-30:] if len(price_history_data) > 30 else price_history_data
        
        # Limit term structure points - take every other point
        limited_term_structure = curve_points[::2] if len(curve_points) > 20 else curve_points
        
        # Calculate IV percentile (simple estimate)
        iv_percentile = int(round(iv30 * 100))
        
        # Add IV percentile to stock info
        stock_info['ivPercentile'] = iv_percentile
        
        # Build result object - EXACTLY matching calculator.py output format
        result = {
            'ticker': ticker,
            'stockInfo': stock_info,
            'currentPrice': float(underlying_price),
            'analysis': {
                'avg_volume': avg_volume_pass,  # Boolean exactly as returned by calculator.py
                'avg_volume_value': float(avg_volume),
                'iv30_rv30': iv30_rv30_pass,  # Boolean exactly as returned by calculator.py
                'iv30_rv30_value': float(iv30_rv30),
                'ts_slope_0_45': ts_slope_pass,  # Boolean exactly as returned by calculator.py
                'ts_slope_0_45_value': float(ts_slope_0_45),
                'expected_move': expected_move,
                'expected_move_value': expected_move_value
            },
            'raw': {
                'rv30': float(rv30),
                'iv30': float(iv30)
            },
            'chartData': {
                'termStructure': limited_term_structure,
                'optionData': option_data[:5] if len(option_data) > 5 else option_data,  # Limit to 5 expiration dates
                'priceHistory': limited_price_history,
                'volatility': volatility_data
            }
        }
        
        # Ensure all data is properly serializable
        result = ensure_serializable(result)
        
        try:
            # Directly use Flask's jsonify which handles serialization better
            return jsonify(result)
        except Exception as json_error:
            print(f"JSON serialization error: {str(json_error)}")
            # Try alternative serialization approach
            try:
                # Convert the result manually using the custom encoder
                sanitized_result = json.loads(json.dumps(result, cls=NpEncoder))
                return jsonify(sanitized_result)
            except Exception as second_error:
                print(f"Second serialization attempt failed: {str(second_error)}")
                # Return a simplified response as last resort
                return jsonify({
                    "ticker": ticker,
                    "error": "Data serialization issue, check server logs",
                    "message": str(json_error)
                }), 500
    
    except Exception as e:
        import traceback
        print("===================== ERROR =====================")
        print(traceback.format_exc())
        print("================================================")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask server on http://localhost:5000")
    print("Use CTRL+C to stop the server")
    app.run(debug=True, port=5000)