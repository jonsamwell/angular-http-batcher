/**
 *
 * @param request
 * @param statusCode
 * @param statusText
 * @param data
 * @param headers - object or string
 * @constructor
 */
function HttpBatchResponseData(request, statusCode, statusText, data, headers) {
  this.request = request;
  this.statusCode = statusCode;
  this.statusText = statusText;
  this.data = data;
  this.headers = headers;
}

global.ahb.HttpBatchResponseData = HttpBatchResponseData;
