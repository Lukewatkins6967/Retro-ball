using UnityEngine;

public static class ExtentionsPause
{
	public static bool Paused(this GameObject obj)
	{
		if (Time.timeScale <= 0f)
		{
			return true;
		}
		if (!SystemTime.IsLayerPauseable(obj.layer))
		{
			return false;
		}
		return SystemTime.Paused;
	}
}
