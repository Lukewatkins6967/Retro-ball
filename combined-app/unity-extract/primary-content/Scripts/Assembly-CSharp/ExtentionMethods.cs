using System;
using System.Collections.Generic;
using UnityEngine;

public static class ExtentionMethods
{
	public static Rect Encapsulate(this Rect rect, Rect other)
	{
		return Rect.MinMaxRect(Mathf.Min(rect.xMin, other.xMin), Mathf.Min(rect.yMin, other.yMin), Mathf.Max(rect.xMax, other.xMax), Mathf.Max(rect.yMax, other.yMax));
	}

	public static Vector2 ToGameXYCoords(this Vector3 vector)
	{
		return new Vector2(vector.x, vector.z);
	}

	public static Vector3 FromGameXYCoords(this Vector2 vector)
	{
		return new Vector3(vector.x, 0f, vector.y);
	}

	public static Vector2 WithX(this Vector2 vector, float x)
	{
		return new Vector2(x, vector.y);
	}

	public static Vector2 WithY(this Vector2 vector, float y)
	{
		return new Vector2(vector.x, y);
	}

	public static Vector3 WithZ(this Vector2 vector, float z)
	{
		return new Vector3(vector.x, vector.y, z);
	}

	public static Vector3 WithX(this Vector3 vector, float x)
	{
		return new Vector3(x, vector.y, vector.z);
	}

	public static Vector3 WithY(this Vector3 vector, float y)
	{
		return new Vector3(vector.x, y, vector.z);
	}

	public static Vector3 WithXY(this Vector3 vector, float x, float y)
	{
		return new Vector3(x, y, vector.z);
	}

	public static Vector3 WithZ(this Vector3 vector, float z)
	{
		return new Vector3(vector.x, vector.y, z);
	}

	public static Vector2 Clamp(this Vector2 vector, Vector2 min, Vector2 max)
	{
		vector.x = Mathf.Clamp(vector.x, min.x, max.x);
		vector.y = Mathf.Clamp(vector.y, min.y, max.y);
		return vector;
	}

	public static Vector3 Clamp(this Vector3 vector, Vector3 min, Vector3 max)
	{
		vector.x = Mathf.Clamp(vector.x, min.x, max.x);
		vector.y = Mathf.Clamp(vector.y, min.y, max.y);
		vector.z = Mathf.Clamp(vector.z, min.z, max.z);
		return vector;
	}

	public static Vector2 Clamp01(this Vector2 vector)
	{
		vector.x = Mathf.Clamp01(vector.x);
		vector.y = Mathf.Clamp01(vector.y);
		return vector;
	}

	public static Vector3 Clamp01(this Vector3 vector)
	{
		vector.x = Mathf.Clamp01(vector.x);
		vector.y = Mathf.Clamp01(vector.y);
		vector.z = Mathf.Clamp01(vector.z);
		return vector;
	}

	public static Vector2 GetTangent(this Vector2 vector)
	{
		return new Vector2(0f - vector.y, vector.x);
	}

	public static Vector2 GetTangentR(this Vector2 vector)
	{
		return new Vector2(vector.y, 0f - vector.x);
	}

	public static Vector3 Snap(this Vector3 pos, float snapTo)
	{
		return new Vector3(Utils.Snap(pos.x, snapTo), Utils.Snap(pos.y, snapTo), Utils.Snap(pos.z, snapTo));
	}

	public static Vector2 Snap(this Vector2 pos, float snapTo)
	{
		return new Vector2(Utils.Snap(pos.x, snapTo), Utils.Snap(pos.y, snapTo));
	}

	public static bool IsInLayerMask(this GameObject obj, LayerMask mask)
	{
		return (mask.value & (1 << obj.layer)) > 0;
	}

	public static Quaternion GetDirectionRotation(this Vector2 direction)
	{
		if (direction.y != 0f)
		{
			return Quaternion.FromToRotation(Vector3.right, direction);
		}
		Quaternion identity = Quaternion.identity;
		identity.eulerAngles = new Vector3(0f, 0f, 57.29578f * Mathf.Atan2(direction.y, direction.x));
		return identity;
	}

	public static float GetDirectionAngle(this Vector2 direction)
	{
		if (Mathf.Approximately(direction.y, 0f))
		{
			if (direction.x >= 0f)
			{
				return 0f;
			}
			return 180f;
		}
		if (Mathf.Approximately(direction.x, 0f))
		{
			if (direction.y >= 0f)
			{
				return 90f;
			}
			return 270f;
		}
		return 57.29578f * Mathf.Atan2(direction.y, direction.x);
	}

	public static T GetComponentInParents<T>(this GameObject gameObject) where T : Component
	{
		Transform transform = gameObject.transform;
		while (transform != null)
		{
			T component = transform.GetComponent<T>();
			if (component != null)
			{
				return component;
			}
			transform = transform.parent;
		}
		return (T)null;
	}

	public static void RemoveDefaultElements<T>(this List<T> list)
	{
		int count = list.Count;
		for (int num = count - 1; num >= 0; num--)
		{
			if (object.Equals(list[num], default(T)))
			{
				list.RemoveAt(num);
			}
		}
	}

	public static T LastOrDefault<T>(this IList<T> list)
	{
		return (list != null && list.Count != 0) ? list[list.Count - 1] : default(T);
	}

	public static T FirstOrDefault<T>(this IList<T> list)
	{
		return (list != null && list.Count != 0) ? list[0] : default(T);
	}

	public static T ElementAtOrDefault<T>(this IList<T> list, int index)
	{
		return (list != null && index >= 0 && index >= list.Count) ? list[index] : default(T);
	}

	public static T LastOrDefault<T>(this T[] list)
	{
		return (list != null && list.Length != 0) ? list[list.Length - 1] : default(T);
	}

	public static T FirstOrDefault<T>(this T[] list)
	{
		return (list != null && list.Length != 0) ? list[0] : default(T);
	}

	public static T ElementAtOrDefault<T>(this T[] list, int index)
	{
		return (list != null && index >= 0 && index >= list.Length) ? list[index] : default(T);
	}

	public static void Shuffle<T>(this IList<T> list)
	{
		int num = 0;
		int count = list.Count;
		for (int num2 = count - 1; num2 >= 1; num2--)
		{
			num = UnityEngine.Random.Range(0, num2 + 1);
			T value = list[num2];
			list[num2] = list[num];
			list[num] = value;
		}
	}

	public static List<T> ShuffleListCopy<T>(this List<T> list)
	{
		int count = list.Count;
		List<T> list2 = new List<T>(list);
		int num = 0;
		for (int i = 1; i < count; i++)
		{
			num = UnityEngine.Random.Range(0, i + 1);
			if (num != i)
			{
				list2[i] = list2[num];
			}
			list2[num] = list[i];
		}
		return list2;
	}

	public static void Shuffle<T>(this T[] list)
	{
		int num = 0;
		int num2 = list.Length;
		for (int num3 = num2 - 1; num3 >= 1; num3--)
		{
			num = UnityEngine.Random.Range(0, num3 + 1);
			T val = list[num3];
			list[num3] = list[num];
			list[num] = val;
		}
	}

	public static T[] ShuffleCopy<T>(this T[] list)
	{
		int num = list.Length;
		T[] array = new T[num];
		array[0] = list[0];
		int num2 = 0;
		for (int i = 1; i < num; i++)
		{
			num2 = UnityEngine.Random.Range(0, i + 1);
			if (num2 != i)
			{
				array[i] = array[num2];
			}
			array[num2] = list[i];
		}
		return array;
	}

	public static T Choose<T>(this IList<T> values, Func<T, float> getWeight)
	{
		float num = 0f;
		for (int i = 0; i < values.Count; i++)
		{
			num += getWeight(values[i]);
		}
		float num2 = UnityEngine.Random.value * num;
		for (int j = 0; j < values.Count; j++)
		{
			num2 -= getWeight(values[j]);
			if (num2 < 0f)
			{
				return values[j];
			}
		}
		return values[values.Count - 1];
	}

	public static Color WithAlpha(this Color col, float alpha)
	{
		return new Color(col.r, col.g, col.b, alpha);
	}

	public static bool IsIndexValid<T>(this List<T> list, int index)
	{
		return index >= 0 && index < list.Count;
	}

	public static bool IsIndexValid<T>(this T[] list, int index)
	{
		return index >= 0 && index < list.Length;
	}

	public static T[] Populate<T>(this T[] arr, T value)
	{
		for (int i = 0; i < arr.Length; i++)
		{
			arr[i] = value;
		}
		return arr;
	}

	public static GameObject Spawn(this GameObject prefab, Vector2 position, float angle = 0f)
	{
		return (!(prefab == null)) ? (UnityEngine.Object.Instantiate(prefab, position, Quaternion.Euler(0f, 0f, angle)) as GameObject) : null;
	}

	public static GameObject Spawn(this GameObject prefab)
	{
		return (!(prefab == null)) ? (UnityEngine.Object.Instantiate(prefab, Vector2.zero, Quaternion.identity) as GameObject) : null;
	}

	public static GameObject Spawn(this GameObject prefab, Transform parent)
	{
		return (!(prefab == null)) ? (UnityEngine.Object.Instantiate(prefab, parent) as GameObject) : null;
	}

	public static GameObject Spawn(this GameObject prefab, Transform parent, Vector2 position, float angle = 0f)
	{
		return (!(prefab == null)) ? (UnityEngine.Object.Instantiate(prefab, position, Quaternion.Euler(0f, 0f, angle), parent) as GameObject) : null;
	}
}
