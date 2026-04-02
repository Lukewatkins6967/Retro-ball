using UnityEngine;

public static class VectorExtensions
{
	public static Vector3 Change(this Vector3 org, object x = null, object y = null, object z = null)
	{
		return new Vector3((x != null) ? ((float)x) : org.x, (y != null) ? ((float)y) : org.y, (z != null) ? ((float)z) : org.z);
	}

	public static Bounds GetEnclosingBounds(this Vector3[] points)
	{
		if (points.Length == 0)
		{
			return default(Bounds);
		}
		Bounds result = new Bounds(points[0], Vector3.zero);
		for (int i = 1; i < points.Length; i++)
		{
			result.Encapsulate(points[i]);
		}
		return result;
	}

	public static Vector3 Average(this Vector3[] points)
	{
		if (points.Length == 0)
		{
			return Vector3.zero;
		}
		Vector3 zero = Vector3.zero;
		for (int i = 1; i < points.Length; i++)
		{
			zero += points[i];
		}
		return zero / points.Length;
	}
}
