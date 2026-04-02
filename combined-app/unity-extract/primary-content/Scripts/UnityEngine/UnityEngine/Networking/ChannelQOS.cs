using System;

namespace UnityEngine.Networking
{
	[Serializable]
	public class ChannelQOS
	{
		[SerializeField]
		internal QosType m_Type;

		public QosType QOS
		{
			get
			{
				return m_Type;
			}
		}

		public ChannelQOS(QosType value)
		{
			m_Type = value;
		}

		public ChannelQOS()
		{
			m_Type = QosType.Unreliable;
		}

		public ChannelQOS(ChannelQOS channel)
		{
			if (channel == null)
			{
				throw new NullReferenceException("channel is not defined");
			}
			m_Type = channel.m_Type;
		}
	}
}
