using System;
using System.Collections.Generic;
using UnityEngine;

public class AIController : MonoBehaviour
{
	[Serializable]
	private class DifficultyData
	{
		public string m_name = "Easy";

		public MinMaxRange m_buttonPressFrequency = new MinMaxRange(0f);

		public MinMaxRange m_directionChangeFrequency = new MinMaxRange(0f);

		public float m_directionAngleErrorMax;

		public float m_attackCooldownDuration = 0.5f;

		public MinMaxRange m_attackWait = new MinMaxRange(0.5f);

		public MinMaxRange m_throwWeaponWait = new MinMaxRange(0.5f);

		public MinMaxRange m_passWait = new MinMaxRange(1f, 6f);

		public MinMaxRange m_dodgeWait = new MinMaxRange(1f, 6f);

		public float m_shootRetryTime = 2f;

		public MinMaxRange m_randomIdleOffTime = new MinMaxRange(1f);

		public MinMaxRange m_randomIdleOnTime = new MinMaxRange(0f);
	}

	private enum eInput
	{
		Shoot = 0,
		Pass = 1,
		Dodge = 2,
		Jump = 3
	}

	[Header("Debug")]
	[SerializeField]
	private string m_debugStatus = string.Empty;

	[SerializeField]
	[Header("Difficulty Data")]
	private DifficultyData[] m_difficultyData = new DifficultyData[2];

	[SerializeField]
	[Header("Constants")]
	private float m_attackTriggerDistance = 1f;

	[SerializeField]
	private MinMaxRange m_throwInCallWait = new MinMaxRange(0.5f, 2f);

	[SerializeField]
	private float m_shootDistRetreat = 2f;

	[SerializeField]
	private float m_shootDistMin = 3f;

	[SerializeField]
	private float m_shootDistMax = 7f;

	[SerializeField]
	private MinMaxRange m_shootWait = new MinMaxRange(2f, 3f);

	[SerializeField]
	private float m_passWhenEnemyInRadius = 4f;

	[SerializeField]
	private MinMaxRange m_directionErrorUpdateTime = new MinMaxRange(0.2f, 1f);

	[SerializeField]
	private MinMaxRange m_randomIdleRunTime = new MinMaxRange(1f, 3f);

	private Player m_player;

	private Vector2 m_inputMove;

	private bool m_inputShoot;

	private bool m_inputPass;

	private bool m_inputDodge;

	private bool m_inputJump;

	private float m_attackCooldownTimer;

	private float m_agroCooldownTimer;

	private Vector3 m_randomPointTarget = Vector3.zero;

	private Vector3 m_randomPointMin = Vector3.zero;

	private Vector3 m_randomPointMax = Vector3.zero;

	private string m_randomPointSource;

	private float m_directionAngleError;

	private bool m_randomIdleActive;

	private float m_randomIdleTimer;

	private bool m_moveToPosition;

	private bool m_moveImmediate;

	private Vector3 m_targetPosition = Vector3.zero;

	private Basketball m_activeBasketball;

	private Team m_team;

	private float m_timeSinceShot;

	private DifficultyData Data
	{
		get
		{
			return m_difficultyData[(int)Singleton<SystemGame>.Get.GetDifficulty()];
		}
	}

	public Vector2 GetInputMove()
	{
		return m_inputMove;
	}

	public bool GetInputShoot()
	{
		bool inputShoot = m_inputShoot;
		m_inputShoot = false;
		return inputShoot;
	}

	public bool GetInputPass()
	{
		bool inputPass = m_inputPass;
		m_inputPass = false;
		return inputPass;
	}

	public bool GetInputDodge()
	{
		bool inputDodge = m_inputDodge;
		m_inputDodge = false;
		return inputDodge;
	}

	public bool GetInputJump()
	{
		bool inputJump = m_inputJump;
		m_inputJump = false;
		return inputJump;
	}

	private void Awake()
	{
		m_player = GetComponent<Player>();
		m_randomIdleTimer = Data.m_randomIdleOffTime.GetRandom();
	}

	private void Update()
	{
		if (m_attackCooldownTimer > 0f)
		{
			m_attackCooldownTimer -= Time.deltaTime;
		}
		if (m_agroCooldownTimer > 0f)
		{
			m_agroCooldownTimer -= Time.deltaTime;
		}
		m_timeSinceShot += Time.deltaTime;
		m_moveToPosition = false;
		m_targetPosition = Vector3.zero;
		m_team = m_player.GetTeam();
		List<Basketball> basketballs = Singleton<SystemGame>.Get.GetBasketballs();
		m_activeBasketball = basketballs.FirstOrDefault();
		if (m_activeBasketball == null)
		{
			return;
		}
		bool flag = false;
		if (!flag)
		{
			flag = UpdateThrowIn();
		}
		if (!flag)
		{
			flag = UpdateTeamMateThrowIn();
		}
		if (!flag)
		{
			flag = UpdateRandomIdle();
		}
		if (!flag)
		{
			flag = UpdateOtherTeamThrowIn();
		}
		if (!flag)
		{
			flag = UpdateHasBall();
		}
		if (!flag)
		{
			flag = UpdateLooseBall();
		}
		if (!flag)
		{
			flag = UpdateTeammateHasBall();
		}
		if (!flag)
		{
			flag = UpdateEnemyHasBall();
		}
		if (!m_player.GetReceivingPass())
		{
			Vector3 vector = m_targetPosition - base.transform.position;
			if (m_moveToPosition && vector.sqrMagnitude > 1f)
			{
				SetInputMoveError(vector.normalized.ToGameXYCoords());
			}
			else
			{
				m_inputMove = Vector2.zero;
			}
		}
	}

	private bool UpdateThrowIn()
	{
		if (!m_player.GetThrowingIn())
		{
			return false;
		}
		m_debugStatus = "throwing in";
		return true;
	}

	private bool UpdateTeamMateThrowIn()
	{
		if (!Singleton<SystemGame>.Get.GetThrowInActive() || m_player.GetThrowingIn())
		{
			return false;
		}
		Player player = m_player.GetTeam().GetPlayers().Find((Player item) => item.GetThrowingIn());
		if (player == null)
		{
			return false;
		}
		if (m_player.GetAlive() && m_player.CanRecievePass() && !player.GetThrowingInPassDisabled() && Utils.GetTimeIncrementPassed(m_throwInCallWait))
		{
			m_debugStatus = "Team mate is throwing in: calling for ball";
			m_inputPass = true;
			m_throwInCallWait.Randomise();
		}
		else
		{
			m_debugStatus = "Team mate is throwing in: waiting";
		}
		UpdateRandomRunToPoint(1f * m_team.GetDefendDirection(), 10f * m_team.GetDefendDirection(), -5f, 5f);
		return true;
	}

	private bool UpdateRandomIdle()
	{
		m_randomIdleTimer -= Time.deltaTime;
		if (m_randomIdleTimer <= 0f)
		{
			if (m_randomIdleActive)
			{
				m_randomIdleActive = false;
				m_randomIdleTimer = Data.m_randomIdleOffTime.GetRandom();
			}
			else
			{
				m_randomIdleActive = true;
				m_randomIdleTimer = Data.m_randomIdleOnTime.GetRandom();
			}
		}
		if (m_randomIdleActive)
		{
			m_debugStatus = "Idle";
			string source = "idle";
			if (Utils.GetTimeIncrementPassed(m_randomIdleRunTime))
			{
				source = "Reset";
				m_randomIdleRunTime.Randomise();
			}
			UpdateRandomRunToPoint(-10f, 10f, -6f, 6f, source);
			return true;
		}
		return false;
	}

	private bool UpdateOtherTeamThrowIn()
	{
		if (!Singleton<SystemGame>.Get.GetThrowInActive() || m_player.GetThrowingIn())
		{
			return false;
		}
		Player player = m_player.GetTeam().GetPlayers().Find((Player item) => item.GetThrowingIn());
		if (player != null)
		{
			return false;
		}
		if (m_attackCooldownTimer <= 0f)
		{
			Player closestEnemy = GetClosestEnemy(m_player);
			if (closestEnemy != null && Vector3.Distance(closestEnemy.transform.position, base.transform.position) <= m_attackTriggerDistance && Utils.GetTimeIncrementPassed(Data.m_attackWait))
			{
				MoveToPosition(closestEnemy.transform.position);
				m_inputShoot = true;
				m_attackCooldownTimer = Data.m_attackCooldownDuration;
				m_debugStatus = "Defending- attack while throw in";
				return true;
			}
		}
		if (UpdateGetWeapon(5f))
		{
			return true;
		}
		Team team = Singleton<SystemGame>.Get.GetTeams().Find((Team item) => item != m_player.GetTeam());
		if (team == null)
		{
			return false;
		}
		Player player2 = team.GetPlayers().Find((Player item) => !item.GetThrowingIn());
		UpdateRandomRunToPoint(player2.transform.position.x + -1f * m_team.GetDefendDirection(), player2.transform.position.x + 6f * m_team.GetDefendDirection(), -4f, 4f, (!Utils.GetTimeIncrementPassed(2f)) ? "ThrowInDefence" : null);
		m_debugStatus = "Defending- throw in defensive positions";
		return true;
	}

	private bool UpdateHasBall()
	{
		if (!m_player.HasBall())
		{
			return false;
		}
		Hoop attackHoop = m_team.GetAttackHoop();
		Vector3 rhs = attackHoop.GetAiTargetPos() - base.transform.position;
		float magnitude = rhs.magnitude;
		Vector3 right = attackHoop.GetBackboard().transform.right;
		m_moveToPosition = true;
		bool flag = false;
		float num = Vector3.Dot(-right, rhs);
		if (num <= 1f)
		{
			MoveToPosition(m_player.transform.position + right * 10f);
			m_debugStatus = "Moving To shoot- too close (behind net)";
		}
		else if (magnitude < m_shootDistRetreat)
		{
			MoveToPosition(m_player.transform.position + right * 10f);
			m_debugStatus = "Moving To shoot- too close";
		}
		else if (magnitude > m_shootDistMax)
		{
			MoveToPosition(attackHoop.GetAiTargetPos());
			m_debugStatus = "Moving To shoot- too far";
		}
		else
		{
			m_debugStatus = "Ready to shoot";
			flag = true;
			bool flag2 = false;
			if (magnitude > m_shootDistMin)
			{
				MoveToPosition(attackHoop.GetAiTargetPos());
			}
			else
			{
				flag2 = true;
				if (m_timeSinceShot >= Data.m_shootRetryTime)
				{
					m_inputJump = true;
					MoveToPosition(attackHoop.GetAiTargetPos(), true);
					m_timeSinceShot = 0f;
				}
			}
			if (m_timeSinceShot >= Data.m_shootRetryTime && (Utils.GetTimeIncrementPassed(m_shootWait) || flag2))
			{
				m_shootWait.Randomise();
				m_timeSinceShot = 0f;
				MoveToPosition(attackHoop.GetAiTargetPos(), true);
				m_inputShoot = true;
				m_debugStatus = "Shoot";
				return true;
			}
			if (flag2 && m_timeSinceShot < Data.m_shootRetryTime && !m_player.GetInAir() && !m_inputJump)
			{
				m_inputPass = true;
				m_debugStatus = "Pass";
			}
		}
		Player closestEnemy = GetClosestEnemy(m_player);
		if (closestEnemy != null && (closestEnemy.transform.position - base.transform.position).sqrMagnitude < m_passWhenEnemyInRadius * m_passWhenEnemyInRadius && !flag)
		{
			if (PressInput(eInput.Pass, Data.m_passWait))
			{
				m_debugStatus = "Pass";
			}
			else if (PressInput(eInput.Dodge, Data.m_dodgeWait))
			{
				m_debugStatus = "Dodge";
			}
		}
		return true;
	}

	private bool UpdateLooseBall()
	{
		if (m_activeBasketball.GetState() != Basketball.eState.Loose && m_activeBasketball.GetState() != Basketball.eState.Shoot)
		{
			return false;
		}
		Player closestTeamMateToBall = GetClosestTeamMateToBall();
		if (m_player == closestTeamMateToBall)
		{
			m_debugStatus = "Loose ball- I'm closest";
			MoveToPosition(m_activeBasketball.transform.position);
			PressInput(eInput.Dodge, Data.m_dodgeWait);
		}
		else
		{
			m_debugStatus = "Loose ball- Not closest";
			if (UpdateGetWeapon(5f))
			{
				return true;
			}
			UpdateRandomRunToPoint(1f * m_team.GetAttackDirection(), 13f * m_team.GetAttackDirection(), -6f, 6f);
		}
		return true;
	}

	private bool UpdateTeammateHasBall()
	{
		if (m_activeBasketball.GetState() != Basketball.eState.Held && m_activeBasketball.GetState() != Basketball.eState.Pass)
		{
			return false;
		}
		if ((m_activeBasketball.GetPlayerHolding() != null && m_activeBasketball.GetPlayerHolding().GetTeam() == m_player.GetTeam()) || (m_activeBasketball.GetPlayerReceiving() != null && m_activeBasketball.GetPlayerReceiving().GetTeam() == m_player.GetTeam()))
		{
			if (UpdateGetWeapon(5f))
			{
				return true;
			}
			UpdateRandomRunToPoint(5f * m_team.GetAttackDirection(), 13f * m_team.GetAttackDirection(), -6f, 6f);
			m_debugStatus = "Teammate has ball";
			return true;
		}
		return false;
	}

	private bool UpdateEnemyHasBall()
	{
		if (m_activeBasketball.GetState() != Basketball.eState.Held && m_activeBasketball.GetState() != Basketball.eState.Pass)
		{
			return false;
		}
		bool flag = false;
		if (!flag)
		{
			flag = UpdateThrowWeapon(m_activeBasketball.GetPlayerHolding());
		}
		if (!flag)
		{
			flag = UpdateGetWeapon(2f);
		}
		if (!flag && GetClosestTeamMateToBallUpCourt() == m_player)
		{
			Vector3 vector = m_activeBasketball.transform.position - base.transform.position;
			MoveToPosition(m_activeBasketball.transform.position);
			if (vector.magnitude > m_attackTriggerDistance)
			{
				m_debugStatus = "Defending- chasing player";
			}
			else
			{
				m_debugStatus = "Defending- attack cooldown";
				if (m_attackCooldownTimer <= 0f && Utils.GetTimeIncrementPassed(Data.m_attackWait))
				{
					m_inputShoot = true;
					m_attackCooldownTimer = Data.m_attackCooldownDuration;
					m_debugStatus = "Defending- attack";
				}
			}
			flag = true;
		}
		if (!flag)
		{
			flag = UpdateGetWeapon(5f);
		}
		if (!flag && !GetUpCourtFromBall(m_player))
		{
			m_debugStatus = "Defending- Secondary (moving upcourt)";
			UpdateRandomRunToPoint(m_team.GetDefendDirection() * 6f, m_team.GetDefendDirection() * 13f, -8f, 8f);
			flag = true;
		}
		if (!flag)
		{
			flag = UpdateGetWeapon(10f);
		}
		if (!flag && GetUpCourtFromBall(m_player))
		{
			m_debugStatus = "Defending- Secondary (moving randomly)";
			UpdateRandomRunToPoint(m_team.GetDefendDirection() * 3f, m_team.GetDefendDirection() * 13f, -8f, 8f);
			flag = true;
		}
		return flag;
	}

	private bool UpdateGetWeapon(float range)
	{
		float num = float.MaxValue;
		GameObject gameObject = null;
		if (m_player.HasWeapon() || m_player.HasBall())
		{
			return false;
		}
		range *= range;
		foreach (GameObject weapon in Singleton<SystemGame>.Get.GetWeapons())
		{
			if (weapon.GetComponent<Weapon>().CanPickUp(m_player))
			{
				float sqrMagnitude = (base.transform.position - weapon.transform.position).sqrMagnitude;
				if (sqrMagnitude < range && sqrMagnitude < num)
				{
					gameObject = weapon;
					num = sqrMagnitude;
				}
			}
		}
		if (gameObject == null)
		{
			return false;
		}
		m_debugStatus = "Getting Weapon (Range: " + range + ")";
		MoveToPosition(gameObject.transform.position);
		PressInput(eInput.Dodge, Data.m_dodgeWait);
		return true;
	}

	private bool UpdateThrowWeapon(Player target)
	{
		if (m_player == null || target == null || !m_player.HasWeapon() || !target.CanTakeDamage())
		{
			return false;
		}
		if (!Utils.GetTimeIncrementPassed(Data.m_throwWeaponWait))
		{
			return false;
		}
		MoveToPosition(target.transform.position, true);
		m_attackCooldownTimer = Data.m_attackCooldownDuration;
		m_inputShoot = true;
		m_debugStatus = "Throwing Weapon";
		return true;
	}

	private Player GetClosestTeamMateToBall()
	{
		List<Player> alivePlayers = m_player.GetTeam().GetAlivePlayers();
		alivePlayers.Sort(delegate(Player x, Player y)
		{
			Vector3 vector = m_activeBasketball.transform.position - x.transform.position;
			Vector3 vector2 = m_activeBasketball.transform.position - y.transform.position;
			return (!(vector.sqrMagnitude < vector2.sqrMagnitude)) ? 1 : (-1);
		});
		return alivePlayers.FirstOrDefault();
	}

	private bool GetUpCourtFromBall(Player player)
	{
		return (player.transform.position.x - (m_activeBasketball.transform.position.x - m_attackTriggerDistance)) * m_team.GetDefendDirection() > 0f;
	}

	private Player GetClosestTeamMateToBallUpCourt()
	{
		bool flag = false;
		float num = float.MaxValue;
		Player result = null;
		foreach (Player alivePlayer in m_player.GetTeam().GetAlivePlayers())
		{
			bool upCourtFromBall = GetUpCourtFromBall(alivePlayer);
			float sqrMagnitude = (m_activeBasketball.transform.position - alivePlayer.transform.position).sqrMagnitude;
			if ((upCourtFromBall && !flag) || sqrMagnitude < num)
			{
				result = alivePlayer;
				flag = upCourtFromBall;
				num = sqrMagnitude;
			}
		}
		return result;
	}

	private Player GetClosestEnemy(Player toPlayer = null)
	{
		if (toPlayer == null)
		{
			toPlayer = m_player;
		}
		Team team = Singleton<SystemGame>.Get.GetTeams().Find((Team item) => item != m_player.GetTeam());
		if (team == null)
		{
			return null;
		}
		List<Player> alivePlayers = team.GetAlivePlayers();
		alivePlayers.Sort(delegate(Player x, Player y)
		{
			Vector3 vector = toPlayer.transform.position - x.transform.position;
			Vector3 vector2 = toPlayer.transform.position - y.transform.position;
			return (!(vector.sqrMagnitude < vector2.sqrMagnitude)) ? 1 : (-1);
		});
		return alivePlayers.FirstOrDefault();
	}

	private void UpdateRandomRunToPoint(float minX, float maxX, float minZ, float maxZ, string source = null)
	{
		if (minX < maxX)
		{
			Utils.Swap(ref minX, ref maxX);
		}
		Vector3 vector = new Vector3(minX, 0f, minZ);
		Vector3 vector2 = new Vector3(maxX, 0f, maxZ);
		bool flag = (base.transform.position - m_randomPointTarget).sqrMagnitude <= 1f;
		if ((((vector - m_randomPointMin).sqrMagnitude > 1f || (vector2 - m_randomPointMax).sqrMagnitude > 1f) && (source == null || m_randomPointSource != source)) || flag)
		{
			m_randomPointTarget = new Vector3(UnityEngine.Random.Range(m_randomPointMin.x, m_randomPointMax.x), 0f, UnityEngine.Random.Range(m_randomPointMin.z, m_randomPointMax.z));
			m_randomPointMin = vector;
			m_randomPointMax = vector2;
			m_randomPointSource = source;
		}
		MoveToPosition(m_randomPointTarget, true);
	}

	private bool PressInputDefaultFrequency(eInput input)
	{
		return PressInput(input, Data.m_buttonPressFrequency);
	}

	private bool PressInput(eInput input, float frequency)
	{
		if (SystemTime.TimePassed(frequency))
		{
			PressInput(input);
			return true;
		}
		return false;
	}

	private bool PressInput(eInput input, MinMaxRange frequency)
	{
		if (SystemTime.TimePassed(frequency))
		{
			frequency.Randomise();
			PressInput(input);
			return true;
		}
		return false;
	}

	private void PressInput(eInput input)
	{
		switch (input)
		{
		case eInput.Dodge:
			m_inputDodge = true;
			break;
		case eInput.Jump:
			m_inputJump = true;
			break;
		case eInput.Pass:
			m_inputPass = true;
			break;
		case eInput.Shoot:
			m_inputShoot = true;
			break;
		}
	}

	private bool SetInputMoveError(Vector2 direction)
	{
		if (SystemTime.TimePassed(Data.m_directionChangeFrequency) || m_moveImmediate)
		{
			Data.m_directionChangeFrequency.Randomise();
			if (SystemTime.TimePassed(m_directionErrorUpdateTime))
			{
				m_directionErrorUpdateTime.Randomise();
				m_directionAngleError = UnityEngine.Random.Range(0f - Data.m_directionAngleErrorMax, Data.m_directionAngleErrorMax);
			}
			if (direction != Vector2.zero)
			{
				direction = Quaternion.Euler(0f, 0f, Utils.GetDirectionAngle(direction) + m_directionAngleError) * Vector2.right;
			}
			m_inputMove = direction;
			return true;
		}
		return false;
	}

	private void MoveToPosition(Vector3 position, bool immediate = false)
	{
		m_moveToPosition = true;
		m_targetPosition = position;
		m_moveImmediate = immediate;
	}
}
