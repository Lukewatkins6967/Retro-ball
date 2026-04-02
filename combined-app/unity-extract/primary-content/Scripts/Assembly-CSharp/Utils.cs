using System;
using System.Collections.Generic;
using System.Reflection;
using System.Runtime.Remoting;
using UnityEngine;

public class Utils
{
	private static readonly float ASPECT_16_9 = 1.7777778f;

	private static readonly float ASPECT_16_9_INV = 1f / ASPECT_16_9;

	public static bool IsOffline
	{
		get
		{
			return Network.peerType == NetworkPeerType.Disconnected;
		}
	}

	public static bool IsOnline
	{
		get
		{
			return Network.peerType != NetworkPeerType.Disconnected;
		}
	}

	public static float NormalizeMag(ref Vector2 vector)
	{
		if (ApproximatelyZero(vector.x, float.Epsilon))
		{
			if (ApproximatelyZero(vector.y, float.Epsilon))
			{
				vector = Vector2.zero;
				return 0f;
			}
			float result = Mathf.Abs(vector.y);
			vector.Set(0f, Mathf.Sign(vector.y));
			return result;
		}
		if (ApproximatelyZero(vector.y, float.Epsilon))
		{
			float result2 = Mathf.Abs(vector.x);
			vector.Set(Mathf.Sign(vector.x), 0f);
			return result2;
		}
		float magnitude = vector.magnitude;
		if (magnitude == 0f)
		{
			vector = Vector2.zero;
		}
		else
		{
			vector /= magnitude;
		}
		return magnitude;
	}

	public static Vector2 GetVector2Tangent(Vector2 vector)
	{
		return new Vector2(0f - vector.y, vector.x);
	}

	public static Vector2 GetVector2TangentR(Vector2 vector)
	{
		return new Vector2(vector.y, 0f - vector.x);
	}

	public static Vector3 Snap(Vector3 pos, float snapTo)
	{
		return new Vector3(Snap(pos.x, snapTo), Snap(pos.y, snapTo), Snap(pos.z, snapTo));
	}

	public static Vector2 Snap(Vector2 pos, float snapTo)
	{
		return new Vector2(Snap(pos.x, snapTo), Snap(pos.y, snapTo));
	}

	public static float Snap(float pos, float snapTo)
	{
		if (snapTo < 0.1f)
		{
			return pos;
		}
		return Mathf.Round(pos / snapTo) * snapTo;
	}

	public static bool Approximately(float a, float b, float epsilon)
	{
		return Mathf.Abs(a - b) < epsilon;
	}

	public static bool ApproximatelyZero(float a, float epsilon)
	{
		return (!(a > 0f)) ? (a > 0f - epsilon) : (a < epsilon);
	}

	public static bool ApproximatelyZero(float a)
	{
		return (!(a > 0f)) ? (a > 0f - Mathf.Epsilon) : (a < Mathf.Epsilon);
	}

	public static bool IsInLayerMask(GameObject obj, LayerMask mask)
	{
		return (mask.value & (1 << obj.layer)) > 0;
	}

	public static float EaseCubic(float ratio)
	{
		ratio = Mathf.Clamp01(ratio);
		return -2f * ratio * ratio * ratio + 3f * ratio * ratio;
	}

	public static float EaseCubic(float start, float end, float ratio)
	{
		return start + (end - start) * EaseCubic(ratio);
	}

	public static float Interpolate(float from, float to, float min, float max, float val)
	{
		float num = max - min;
		if (num == 0f)
		{
			return from;
		}
		return Mathf.Lerp(from, to, Mathf.Clamp01((val - min) / num));
	}

	public static float Loop(float val, float min, float max)
	{
		while (val < min)
		{
			val += max - min;
		}
		while (val > max)
		{
			val -= max - min;
		}
		return val;
	}

	public static Quaternion GetDirectionRotation(Vector2 direction)
	{
		if (!ApproximatelyZero(direction.y, float.Epsilon))
		{
			Quaternion result = Quaternion.FromToRotation(Vector3.right, direction);
			if (Approximately(result.z, 1f, float.Epsilon))
			{
				return result;
			}
		}
		return Quaternion.Euler(0f, 0f, 57.29578f * Mathf.Atan2(direction.y, direction.x));
	}

	public static float GetDirectionAngle(Vector2 directionNormalised)
	{
		if (ApproximatelyZero(directionNormalised.y, float.Epsilon))
		{
			if (directionNormalised.x < 0f)
			{
				return 180f;
			}
			return 0f;
		}
		if (ApproximatelyZero(directionNormalised.x, float.Epsilon))
		{
			if (directionNormalised.y < 0f)
			{
				return 270f;
			}
			return 90f;
		}
		return Mathf.Repeat(57.29578f * Mathf.Atan2(directionNormalised.y, directionNormalised.x), 360f);
	}

	public static void Swap<T>(ref T lhs, ref T rhs)
	{
		T val = lhs;
		lhs = rhs;
		rhs = val;
	}

	public static float ClampAngle(float angle, float min, float max)
	{
		float num = 180f - (min + max) * 0.5f;
		min = Mathf.Repeat(min + num, 360f);
		max = Mathf.Repeat(max + num, 360f);
		angle = Mathf.Repeat(angle + num, 360f);
		return Mathf.Clamp(angle, min, max) - num;
	}

	public static bool IsWithinAngle(float angle, float min, float max)
	{
		angle = Mathf.Repeat(angle - min, 360f);
		max = Mathf.Repeat(max - min, 360f);
		return angle >= 0f && angle < max;
	}

	public static bool IsPointInPolygon(Vector2 point, List<Vector2> polygon)
	{
		bool flag = false;
		int count = polygon.Count;
		int num = 0;
		int index = count - 1;
		while (num < count)
		{
			if (polygon[num].y > point.y != polygon[index].y > point.y && point.x < (polygon[index].x - polygon[num].x) * (point.y - polygon[num].y) / (polygon[index].y - polygon[num].y) + polygon[num].x)
			{
				flag = !flag;
			}
			index = num++;
		}
		return flag;
	}

	public static int GetUnixTimestamp()
	{
		DateTime dateTime = new DateTime(1970, 1, 1, 8, 0, 0, DateTimeKind.Utc);
		return (int)(DateTime.UtcNow - dateTime).TotalSeconds;
	}

	public static bool GetTimeIncrementPassed(float time)
	{
		return (Time.timeSinceLevelLoad - Time.deltaTime) % time > Time.timeSinceLevelLoad % time;
	}

	public static T[] CreateFilledArray<T>(int size, T value)
	{
		T[] array = new T[size];
		for (int i = 0; i < array.Length; i++)
		{
			array[i] = value;
		}
		return array;
	}

	public static float NormalizeScreenRatioTo1080X(Camera camera, float ratio)
	{
		if (camera == null)
		{
			return ratio;
		}
		return ratio * (camera.aspect * ASPECT_16_9_INV);
	}

	public static float NormalizeScreenRatioTo1080Y(Camera camera, float ratio)
	{
		if (camera == null)
		{
			return ratio;
		}
		return ratio * (1f / camera.aspect * ASPECT_16_9);
	}

	public static int MaskSetAt(int mask, int index, bool value)
	{
		return (!value) ? (mask & ~(1 << index)) : (mask | (1 << index));
	}

	public static int MaskSetAt(int mask, int index)
	{
		return mask | (1 << index);
	}

	public static int MaskUnsetAt(int mask, int index)
	{
		return mask & ~(1 << index);
	}

	public static bool MaskIsSet(int mask, int index)
	{
		return (mask & (1 << index)) != 0;
	}

	public static void CopyFields<T>(T to, T from)
	{
		Type type = to.GetType();
		if (type == from.GetType())
		{
			BindingFlags bindingAttr = BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic;
			FieldInfo[] fields = type.GetFields(bindingAttr);
			FieldInfo[] array = fields;
			foreach (FieldInfo fieldInfo in array)
			{
				fieldInfo.SetValue(to, fieldInfo.GetValue(from));
			}
		}
	}

	public static void InitWithDefaults<T>(T toInit) where T : class
	{
		T val = Activator.CreateInstance(toInit.GetType()) as T;
		if (val != null)
		{
			CopyFields(toInit, val);
		}
	}

	public static T ConstructByName<T>(string name) where T : class
	{
		T result = (T)null;
		try
		{
			ObjectHandle objectHandle = Activator.CreateInstance(null, name, new object[0]);
			if (objectHandle != null)
			{
				result = objectHandle.Unwrap() as T;
			}
		}
		catch
		{
		}
		return result;
	}

	public static float AccelerateWithDampening(float currSpeed, float maxSpeed, float maxAcceleration, float delta, float accelerationRatio = 1f)
	{
		if (maxSpeed == 0f)
		{
			return 0f;
		}
		currSpeed += accelerationRatio * maxAcceleration * delta;
		currSpeed -= currSpeed * Mathf.Clamp01(delta * maxAcceleration / maxSpeed);
		return currSpeed;
	}

	public static float CalcAccelerateWithDampeningForce(float currSpeed, float maxSpeed, float maxAcceleration, float accelerationRatio = 1f)
	{
		if (maxSpeed == 0f)
		{
			return 0f;
		}
		return accelerationRatio * maxAcceleration - currSpeed * (maxAcceleration / maxSpeed);
	}

	public static Vector2 AccelerateWithDampening(Vector2 currSpeed, Vector2 direction, float maxSpeed, float maxAcceleration, float delta, float accelerationRatio = 1f)
	{
		if (maxSpeed == 0f)
		{
			return Vector2.zero;
		}
		currSpeed += accelerationRatio * maxAcceleration * delta * direction;
		currSpeed -= currSpeed * Mathf.Clamp01(delta * maxAcceleration / maxSpeed);
		return currSpeed;
	}

	public static T GetRandomArrayValue<T>(T[] array)
	{
		if (array.Length == 0)
		{
			return default(T);
		}
		return array[UnityEngine.Random.Range(0, array.Length)];
	}

	public static T GetRandomListValue<T>(List<T> list)
	{
		if (list.Count == 0)
		{
			return default(T);
		}
		return list[UnityEngine.Random.Range(0, list.Count)];
	}
}
