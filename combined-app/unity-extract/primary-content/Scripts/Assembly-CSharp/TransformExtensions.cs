using UnityEngine;

public static class TransformExtensions
{
	public static Transform Closest(this Transform[] transforms, Vector3 position)
	{
		float num = float.MaxValue;
		Transform result = null;
		for (int i = 0; i < transforms.Length; i++)
		{
			float num2 = Vector3.Distance(transforms[i].position, position);
			if (num2 < num)
			{
				num = num2;
				result = transforms[i];
			}
		}
		return result;
	}
}
