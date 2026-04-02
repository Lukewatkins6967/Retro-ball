using System;
using System.Collections.Generic;
using UnityEngine;

public class SineMovement : MonoBehaviour
{
	[Serializable]
	public class Vector
	{
		public enum Mode
		{
			Sine = 0,
			Cosine = 1
		}

		public Mode m_mode;

		public Vector3 m_direction = Vector3.up;

		public float m_speed = 1f;

		public float m_scale = 1f;

		public bool m_absoluteResult;

		public bool m_randomStart;

		private Vector3 m_currentOffset = Vector3.zero;

		private float m_time;

		public void Start()
		{
			if (m_randomStart)
			{
				m_time = UnityEngine.Random.Range(0f, 1f);
			}
		}

		public void Update()
		{
			m_time += Time.deltaTime;
			float f = m_time * m_speed;
			float num = ((m_mode != Mode.Sine) ? Mathf.Cos(f) : Mathf.Sin(f));
			num *= m_scale;
			if (m_absoluteResult)
			{
				num = Mathf.Abs(num);
			}
			m_currentOffset = m_direction * num;
		}

		public Vector3 GetOffset()
		{
			return m_currentOffset;
		}
	}

	[SerializeField]
	private List<Vector> m_vectors = new List<Vector>();

	[SerializeField]
	private bool m_paused;

	private Vector3 m_initialPosition;

	public void SetPaused(bool pause)
	{
		m_paused = pause;
	}

	public void AddVector(Vector vector)
	{
		m_vectors.Add(vector);
	}

	private void Start()
	{
		m_initialPosition = base.transform.localPosition;
		foreach (Vector vector in m_vectors)
		{
			vector.Start();
		}
	}

	private void Update()
	{
		if (m_paused || m_vectors == null)
		{
			return;
		}
		Vector3 zero = Vector3.zero;
		foreach (Vector vector in m_vectors)
		{
			vector.Update();
			zero += vector.GetOffset();
		}
		base.transform.localPosition = m_initialPosition + zero;
	}
}
