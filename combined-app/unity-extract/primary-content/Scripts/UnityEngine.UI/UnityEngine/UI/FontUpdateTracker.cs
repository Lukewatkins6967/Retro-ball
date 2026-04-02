using System.Collections.Generic;

namespace UnityEngine.UI
{
	public static class FontUpdateTracker
	{
		private static Dictionary<Font, List<Text>> m_Tracked = new Dictionary<Font, List<Text>>();

		public static void TrackText(Text t)
		{
			if (t.font == null)
			{
				return;
			}
			List<Text> value;
			m_Tracked.TryGetValue(t.font, out value);
			if (value == null)
			{
				if (m_Tracked.Count == 0)
				{
					Font.textureRebuilt += RebuildForFont;
				}
				value = new List<Text>();
				m_Tracked.Add(t.font, value);
			}
			if (!value.Contains(t))
			{
				value.Add(t);
			}
		}

		private static void RebuildForFont(Font f)
		{
			List<Text> value;
			m_Tracked.TryGetValue(f, out value);
			if (value != null)
			{
				for (int i = 0; i < value.Count; i++)
				{
					value[i].FontTextureChanged();
				}
			}
		}

		public static void UntrackText(Text t)
		{
			if (t.font == null)
			{
				return;
			}
			List<Text> value;
			m_Tracked.TryGetValue(t.font, out value);
			if (value == null)
			{
				return;
			}
			value.Remove(t);
			if (value.Count == 0)
			{
				m_Tracked.Remove(t.font);
				if (m_Tracked.Count == 0)
				{
					Font.textureRebuilt -= RebuildForFont;
				}
			}
		}
	}
}
