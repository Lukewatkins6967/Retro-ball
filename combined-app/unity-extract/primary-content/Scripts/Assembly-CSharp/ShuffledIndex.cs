public class ShuffledIndex
{
	private int m_current = -2;

	private int[] m_ids;

	public int Length
	{
		get
		{
			return m_ids.Length;
		}
	}

	public int Count
	{
		get
		{
			return m_ids.Length;
		}
	}

	public ShuffledIndex(int count)
	{
		m_ids = new int[count];
		for (int i = 0; i < count; i++)
		{
			m_ids[i] = i;
		}
	}

	public int Next()
	{
		m_current++;
		return this;
	}

	public static implicit operator int(ShuffledIndex m)
	{
		if (m.m_ids.Length == 0)
		{
			return -1;
		}
		if (!m.m_ids.IsIndexValid(m.m_current))
		{
			m.m_ids.Shuffle();
			m.m_current = 0;
		}
		return m.m_ids[m.m_current];
	}
}
