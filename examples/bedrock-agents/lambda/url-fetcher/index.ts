import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Lambda function for Bedrock Agent Action Group
 * Fetches and extracts article content from URLs
 */
export const handler = async (event: any) => {
  console.log('URL Fetcher Action Group event:', JSON.stringify(event, null, 2));

  const { apiPath, parameters, requestBody } = event;

  try {
    if (apiPath === '/fetch-url') {
      // Extract URL from either parameters or requestBody
      let url = parameters?.find((p: any) => p.name === 'url')?.value;
      
      // If not in parameters, check requestBody
      if (!url && requestBody?.content?.['application/json']?.properties) {
        url = requestBody.content['application/json'].properties.find((p: any) => p.name === 'url')?.value;
      }
      
      if (!url) {
        return {
          messageVersion: '1.0',
          response: {
            actionGroup: event.actionGroup,
            apiPath: event.apiPath,
            httpMethod: event.httpMethod,
            httpStatusCode: 400,
            responseBody: {
              'application/json': {
                body: JSON.stringify({ error: 'URL parameter is required' })
              }
            }
          }
        };
      }

      console.log(`Fetching URL: ${url}`);

      // Fetch the URL
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 30000,
        maxRedirects: 5,
      });

      // Parse HTML with cheerio
      const $ = cheerio.load(response.data);
      
      // Extract metadata
      const title = $('title').text() || 
                    $('meta[property="og:title"]').attr('content') ||
                    $('h1').first().text() ||
                    'Untitled';
      
      const byline = $('meta[name="author"]').attr('content') || 
                     $('[rel="author"]').text() ||
                     $('.author').first().text() ||
                     '';
      
      const excerpt = $('meta[name="description"]').attr('content') || 
                      $('meta[property="og:description"]').attr('content') ||
                      '';
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .ad, .advertisement, .social-share').remove();
      
      // Extract main content - try article tag first, then main, then body
      let content = $('article').text() || $('main').text() || $('body').text();
      
      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim().substring(0, 10000); // Limit to 10k chars
      
      if (!content || content.length < 100) {
        return {
          messageVersion: '1.0',
          response: {
            actionGroup: event.actionGroup,
            apiPath: event.apiPath,
            httpMethod: event.httpMethod,
            httpStatusCode: 200,
            responseBody: {
              'application/json': {
                body: JSON.stringify({
                  url,
                  title,
                  content: 'Could not extract sufficient article content from this URL.',
                  excerpt
                })
              }
            }
          }
        };
      }

      // Return extracted article
      return {
        messageVersion: '1.0',
        response: {
          actionGroup: event.actionGroup,
          apiPath: event.apiPath,
          httpMethod: event.httpMethod,
          httpStatusCode: 200,
          responseBody: {
            'application/json': {
              body: JSON.stringify({
                url,
                title,
                byline,
                excerpt,
                content,
                siteName: new URL(url).hostname
              })
            }
          }
        }
      };

    } else {
      return {
        messageVersion: '1.0',
        response: {
          actionGroup: event.actionGroup,
          apiPath: event.apiPath,
          httpMethod: event.httpMethod,
          httpStatusCode: 404,
          responseBody: {
            'application/json': {
              body: JSON.stringify({ error: 'Unknown API path' })
            }
          }
        }
      };
    }

  } catch (error) {
    console.error('Error fetching URL:', error);
    
    return {
      messageVersion: '1.0',
      response: {
        actionGroup: event.actionGroup,
        apiPath: event.apiPath,
        httpMethod: event.httpMethod,
        httpStatusCode: 500,
        responseBody: {
          'application/json': {
            body: JSON.stringify({
              error: 'Failed to fetch URL',
              message: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }
    };
  }
};
