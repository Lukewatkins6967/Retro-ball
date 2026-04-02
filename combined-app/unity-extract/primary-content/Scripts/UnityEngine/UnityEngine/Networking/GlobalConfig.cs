using System;

namespace UnityEngine.Networking
{
	[Serializable]
	public class GlobalConfig
	{
		[SerializeField]
		private uint m_ThreadAwakeTimeout;

		[SerializeField]
		private ReactorModel m_ReactorModel;

		[SerializeField]
		private ushort m_ReactorMaximumReceivedMessages;

		[SerializeField]
		private ushort m_ReactorMaximumSentMessages;

		[SerializeField]
		private ushort m_MaxPacketSize;

		public uint ThreadAwakeTimeout
		{
			get
			{
				return m_ThreadAwakeTimeout;
			}
			set
			{
				if (value == 0)
				{
					throw new ArgumentOutOfRangeException("Minimal thread awake timeout should be > 0");
				}
				m_ThreadAwakeTimeout = value;
			}
		}

		public ReactorModel ReactorModel
		{
			get
			{
				return m_ReactorModel;
			}
			set
			{
				m_ReactorModel = value;
			}
		}

		public ushort ReactorMaximumReceivedMessages
		{
			get
			{
				return m_ReactorMaximumReceivedMessages;
			}
			set
			{
				m_ReactorMaximumReceivedMessages = value;
			}
		}

		public ushort ReactorMaximumSentMessages
		{
			get
			{
				return m_ReactorMaximumSentMessages;
			}
			set
			{
				m_ReactorMaximumSentMessages = value;
			}
		}

		public ushort MaxPacketSize
		{
			get
			{
				return m_MaxPacketSize;
			}
			set
			{
				m_MaxPacketSize = value;
			}
		}

		public GlobalConfig()
		{
			m_ThreadAwakeTimeout = 1u;
			m_ReactorModel = ReactorModel.SelectReactor;
			m_ReactorMaximumReceivedMessages = 1024;
			m_ReactorMaximumSentMessages = 1024;
			m_MaxPacketSize = 2000;
		}
	}
}
