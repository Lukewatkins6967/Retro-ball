namespace UnityEngine
{
	public struct CullingGroupEvent
	{
		private const byte kIsVisibleMask = 128;

		private const byte kDistanceMask = 127;

		private int m_Index;

		private byte m_PrevState;

		private byte m_ThisState;

		public int index
		{
			get
			{
				return m_Index;
			}
		}

		public bool isVisible
		{
			get
			{
				return (m_ThisState & 0x80) != 0;
			}
		}

		public bool wasVisible
		{
			get
			{
				return (m_PrevState & 0x80) != 0;
			}
		}

		public bool hasBecomeVisible
		{
			get
			{
				return isVisible && !wasVisible;
			}
		}

		public bool hasBecomeInvisible
		{
			get
			{
				return !isVisible && wasVisible;
			}
		}

		public int currentDistance
		{
			get
			{
				return m_ThisState & 0x7F;
			}
		}

		public int previousDistance
		{
			get
			{
				return m_PrevState & 0x7F;
			}
		}
	}
}
