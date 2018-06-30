﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace ExileParty.Models
{
    [Serializable]
    public class ExtenedAreaInfoModel
    {
        public EventArea EventArea { get; set; }
        public int Type { get; set; }
        public long Timestamp { get; set; }
        public int Duration { get; set; }
    }

    [Serializable]
    public class EventArea
    {
        public string Name { get; set; }
        public string Type { get; set; }
        public List<AreaInfo> Info { get; set; }
    }

    [Serializable]
    public class AreaInfo
    {
        public int Act { get; set; }
        public int Level { get; set; }
        public bool Town { get; set; }
        public bool Waypoint { get; set; }
        public List<string> Bosses { get; set; }
    }

    [Serializable]
    public enum AreaType
    {
        Area = 0,
        Vaal = 1,
        Map = 2,
        Master = 3,
        Labyrinth = 4,
        Unknown = 5
    }

    [Serializable]
    public enum AreaEventType
    {
        Join = 0,
        Leave= 1
    }
}
