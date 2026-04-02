using System;
using UnityEngine;

public class Court : MonoBehaviour
{
	[Serializable]
	public class TeamData
	{
		public Hoop m_attackHoop;

		public Hoop m_defendHoop;

		public Transform[] m_playerSpawns;

		public Transform[] m_attackPositions;

		public Transform[] m_shootPositions;
	}

	[SerializeField]
	private Transform m_ballSpawn;

	[SerializeField]
	private TeamData[] m_teamData;

	public Transform GetBallSpawn()
	{
		return m_ballSpawn;
	}

	public TeamData[] GetTeamData()
	{
		return m_teamData;
	}
}
