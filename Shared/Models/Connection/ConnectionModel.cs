﻿using System;
using System.ComponentModel.DataAnnotations;

namespace Shared.Models.Connection
{
    [Serializable]
    public class ConnectionModel
    {   
        [Key]
        public string ConnectionId { get; set; }
        public string PartyName { get; set; }
        public DateTime ConnectedDate { get; set; }
    }
}
