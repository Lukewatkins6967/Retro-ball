namespace UnityEngine.Experimental.Director
{
	public struct FrameData
	{
		internal int m_UpdateId;

		internal double m_Time;

		internal double m_LastTime;

		internal double m_TimeScale;

		public int updateId
		{
			get
			{
				return m_UpdateId;
			}
		}

		public float time
		{
			get
			{
				return (float)m_Time;
			}
		}

		public float lastTime
		{
			get
			{
				return (float)m_LastTime;
			}
		}

		public float deltaTime
		{
			get
			{
				return (float)m_Time - (float)m_LastTime;
			}
		}

		public float timeScale
		{
			get
			{
				return (float)m_TimeScale;
			}
		}

		public double dTime
		{
			get
			{
				return m_Time;
			}
		}

		public double dLastTime
		{
			get
			{
				return m_LastTime;
			}
		}

		public double dDeltaTime
		{
			get
			{
				return m_Time - m_LastTime;
			}
		}

		public double dtimeScale
		{
			get
			{
				return m_TimeScale;
			}
		}
	}
}
