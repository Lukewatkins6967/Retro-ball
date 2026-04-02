namespace UnityEngine
{
	public struct Touch
	{
		private int m_FingerId;

		private Vector2 m_Position;

		private Vector2 m_RawPosition;

		private Vector2 m_PositionDelta;

		private float m_TimeDelta;

		private int m_TapCount;

		private TouchPhase m_Phase;

		private TouchType m_Type;

		private float m_Pressure;

		private float m_maximumPossiblePressure;

		private float m_Radius;

		private float m_RadiusVariance;

		private float m_AltitudeAngle;

		private float m_AzimuthAngle;

		public int fingerId
		{
			get
			{
				return m_FingerId;
			}
		}

		public Vector2 position
		{
			get
			{
				return m_Position;
			}
		}

		public Vector2 rawPosition
		{
			get
			{
				return m_RawPosition;
			}
		}

		public Vector2 deltaPosition
		{
			get
			{
				return m_PositionDelta;
			}
		}

		public float deltaTime
		{
			get
			{
				return m_TimeDelta;
			}
		}

		public int tapCount
		{
			get
			{
				return m_TapCount;
			}
		}

		public TouchPhase phase
		{
			get
			{
				return m_Phase;
			}
		}

		public float pressure
		{
			get
			{
				return m_Pressure;
			}
		}

		public float maximumPossiblePressure
		{
			get
			{
				return m_maximumPossiblePressure;
			}
		}

		public TouchType type
		{
			get
			{
				return m_Type;
			}
		}

		public float altitudeAngle
		{
			get
			{
				return m_AltitudeAngle;
			}
		}

		public float azimuthAngle
		{
			get
			{
				return m_AzimuthAngle;
			}
		}

		public float radius
		{
			get
			{
				return m_Radius;
			}
		}

		public float radiusVariance
		{
			get
			{
				return m_RadiusVariance;
			}
		}
	}
}
