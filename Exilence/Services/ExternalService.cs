﻿using Exilence.Interfaces;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;

namespace Exilence.Services
{
    public class ExternalService : IExternalService
    {

        private readonly ILogger<ExternalService> _log;
        
        //private bool _rateLimited;

        public ExternalService(ILogger<ExternalService> log)
        {
            _log = log;
        }

        public async Task<string> ExecuteGetAsync(string url)
        {
            var handler = new HttpClientHandler() { AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate, UseCookies = false, UseDefaultCredentials = false };
            try
            {
                using (var client = new HttpClient(handler))
                {
                    client.Timeout = TimeSpan.FromSeconds(15);

                    using (HttpResponseMessage res = await client.GetAsync(url))
                    {
                        if (res.IsSuccessStatusCode)
                        {
                            using (HttpContent content = res.Content)
                            {
                                return await content.ReadAsStringAsync();
                            }
                        }
                        //else
                        //{
                        //    _log.LogError($"Response Error: {res.ReasonPhrase}");
                        //    if (res.StatusCode == HttpStatusCode.TooManyRequests)
                        //    {
                        //    }
                        //}
                        return null;
                    }
                }
            }
            catch (Exception e)
            {
                if (e is TaskCanceledException)
                {
                    _log.LogCritical($"Request timed out after 12 seconds.");
                }
                else
                {
                    _log.LogCritical($"Exception: {e.Message}");
                }

                return null;
            }
        }


    }
}
