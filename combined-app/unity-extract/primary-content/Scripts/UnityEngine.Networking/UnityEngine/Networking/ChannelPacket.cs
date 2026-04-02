using System;

namespace UnityEngine.Networking
{
	internal struct ChannelPacket
	{
		private int m_Position;

		private byte[] m_Buffer;

		private bool m_IsReliable;

		public ChannelPacket(int packetSize, bool isReliable)
		{
			m_Position = 0;
			m_Buffer = new byte[packetSize];
			m_IsReliable = isReliable;
		}

		public void Reset()
		{
			m_Position = 0;
		}

		public bool IsEmpty()
		{
			return m_Position == 0;
		}

		public void Write(byte[] bytes, int numBytes)
		{
			Array.Copy(bytes, 0, m_Buffer, m_Position, numBytes);
			m_Position += numBytes;
		}

		public bool HasSpace(int numBytes)
		{
			return m_Position + numBytes <= m_Buffer.Length;
		}

		public bool SendToTransport(NetworkConnection conn, int channelId)
		{
			bool result = true;
			byte error;
			if (!conn.TransportSend(m_Buffer, (ushort)m_Position, channelId, out error) && (!m_IsReliable || error != 4))
			{
				if (LogFilter.logError)
				{
					Debug.LogError("Failed to send internal buffer channel:" + channelId + " bytesToSend:" + m_Position);
				}
				result = false;
			}
			if (error != 0)
			{
				if (m_IsReliable && error == 4)
				{
					return false;
				}
				if (LogFilter.logError)
				{
					Debug.LogError(string.Concat("Send Error: ", (NetworkError)error, " channel:", channelId, " bytesToSend:", m_Position));
				}
				result = false;
			}
			m_Position = 0;
			return result;
		}
	}
}
