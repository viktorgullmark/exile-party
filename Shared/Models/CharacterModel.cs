﻿using System;
using System.Collections.Generic;

namespace Shared.Models
{
    [Serializable]
    public class CharacterModel
    {
        public string Name { get; set; }
        public string League { get; set; }
        public int ClassId { get; set; }
        public int AscendancyClass { get; set; }
        public string Class { get; set; }
        public int Level { get; set; }
        public List<ItemModel> Items { get; set; }
    }
}
