﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Exilence
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CreateWebHostBuilder(args).Build().Run();
        }

        public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
            WebHost.CreateDefaultBuilder(args)
                .UseKestrel(options =>
                {
                    options.Listen(IPAddress.Loopback, 5678);
                })
                .ConfigureLogging((hostingContext, builder) =>
                {
                    
                    builder.AddFilter((provider, category, logLevel) =>
                    {
                        if (
                        logLevel == LogLevel.Trace ||
                        logLevel == LogLevel.Debug ||
                        logLevel == LogLevel.Warning ||
                        logLevel == LogLevel.Information
                        )
                        {
                            return false;
                        }

                        return true;
                    });


                    builder.AddFile("Logs/Exilence-{Date}.txt");
                })
                .UseStartup<Startup>();
    }
}
