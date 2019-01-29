﻿using System;
using System.Collections.Generic;

namespace Shared.Models.Ladder
{
    [Serializable]
    public class LadderApiCharacter
    {
        public string Name { get; set; }
        public int Level { get; set; }
        public string @Class { get; set; }
        public string Id { get; set; }
        public long Experience { get; set; }
        public Depth Depth { get; set; }
    }

    public class Depth
    {
        public int @default { get; set; }
        public int Solo { get; set; }
    }

    [Serializable]
    public class LadderApiGuild
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Tag { get; set; }
        public DateTime CreatedAt { get; set; }
        public string StatusMessage { get; set; }
    }
    [Serializable]
    public class LadderApiChallenges
    {
        public int Total { get; set; }
    }
    [Serializable]
    public class LadderApiTwitch
    {
        public string Name { get; set; }
    }
    [Serializable]
    public class LadderApiAccount
    {
        public string Name { get; set; }
        public LadderApiGuild Guild { get; set; }
        public LadderApiChallenges Challenges { get; set; }
        public LadderApiTwitch Twitch { get; set; }
    }

    [Serializable]
    public class LadderApiEntry
    {
        public int Rank { get; set; }
        public bool Dead { get; set; }
        public bool Online { get; set; }
        public LadderApiCharacter Character { get; set; }
        public LadderApiAccount Account { get; set; }
    }

    public class LadderApiResponse
    {
        public int Total { get; set; }
        public DateTime Cached_since { get; set; }
        public List<LadderApiEntry> Entries { get; set; }
    }

}
